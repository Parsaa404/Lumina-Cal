import { Context } from 'grammy';
import { db } from '../services/db';
import { analyzeFoodText, analyzeFoodImageWithContext } from '../services/nutrition/visionFallback';
import { VisionAnalysisResult } from '../services/nutrition/visionFallback';
import { isOnboarding } from './onboardingState';
import { handleOnboardingText } from './onboardingHandler';
import { formatMealPreview } from './mealReplyFormatter';
import { setPendingMeal, hasActivePending, getActivePending, updatePendingMeal, PendingMeal } from './pendingMealState';
import { getCachedFood, setCachedFood } from '../services/foodCache';
import { generateFoodSubstitution } from '../services/nutrition/aiRecommendations';
import { searchFastFood } from '../services/fastFoodDb';
import { handleAsk, isNutritionQuestion } from './askHandler';
import { handlePhotoTextAnswer } from './photoQAHandler';

export async function handleText(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Onboarding takes first priority
  if (isOnboarding(telegramUser.id)) {
    const handled = await handleOnboardingText(ctx);
    if (handled) return;
  }

  const text = ctx.message?.text?.trim();
  if (!text) return;

  // ── Photo Q&A text interception (Q2 seasonings or Q3 portions) ──
  if (hasActivePending(telegramUser.id)) {
    const pending = getActivePending(telegramUser.id)!;
    if (pending.step === 'q_seasoning' || pending.step === 'q_portions') {
      const handled = await handlePhotoTextAnswer(ctx);
      if (handled) return;
    }
  }

  // ── Food Substitution Intent Detection ──
  const substitutionIntent = detectSubstitutionIntent(text);
  if (substitutionIntent) {
    const user = await db.getUser(telegramUser.id);
    const loadingMsg = await ctx.reply('🔄 Finding healthier alternatives...');
    try {
      const result = await generateFoodSubstitution(substitutionIntent, user?.fitnessGoal || 'healthy_lifestyle');
      await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id, result, { parse_mode: 'Markdown' });
    } catch {
      await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id, 'Could not find alternatives. Please try again.');
    }
    return;
  }

  // ── AI Nutrition Q&A intent detection ──
  if (isNutritionQuestion(text) && text.length > 15) {
    await handleAsk(ctx);
    return;
  }

  // ── Normal text meal logging ──
  const user = await db.getUser(telegramUser.id);
  if (!user) {
    await ctx.reply('Please use /start first to register.');
    return;
  }

  const message = await ctx.reply('🔍 Analyzing your meal... Please wait.');

  try {
    // 1. Fast food database — instant, most accurate
    const fastFoodHit = searchFastFood(text);
    let analysis = fastFoodHit ? fastFoodToAnalysis(fastFoodHit) : null;
    let fromCache = false;
    let fromDb = !!fastFoodHit;

    // 2. In-memory food cache
    if (!analysis) {
      const cached = getCachedFood(text);
      if (cached) { analysis = cached; fromCache = true; }
    }

    // 3. AI analysis
    if (!analysis) {
      analysis = await analyzeFoodText(text);
      if (analysis) setCachedFood(text, analysis);
    }

    if (!analysis) {
      await ctx.api.editMessageText(ctx.chat?.id as number, message.message_id,
        'Sorry, I could not analyze the text. Please try again with more detail.');
      return;
    }

    setPendingMeal(telegramUser.id, {
      step: 'awaiting_confirm',
      analysis,
      userId: user.id,
      telegramMessageId: ctx.message?.message_id,
      botMessageId: message.message_id,
    });

    let previewText = formatMealPreview(analysis);
    if (fromDb)    previewText += `\n\n🏪 _From fast food database — highly accurate_`;
    else if (fromCache) previewText += `\n\n⚡ _Instant result (cached)_`;

    await ctx.api.editMessageText(
      ctx.chat?.id as number, message.message_id, previewText,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Log Meal', callback_data: `confirm_meal_${message.message_id}` },
            { text: '❌ Discard', callback_data: `discard_meal_${message.message_id}` },
          ]],
        },
      }
    );

  } catch (error) {
    console.error('Text handler error:', error);
    try {
      await ctx.api.editMessageText(ctx.chat?.id as number, message.message_id,
        'An error occurred. Please try again.');
    } catch { /* ignore */ }
  }
}

/**
 * User sent a clarification reply (cooking method / seasonings / portions).
 * Re-analyze the original image with the new context.
 */
async function handleClarificationReply(ctx: Context, clarification: string, pending: PendingMeal) {
  const telegramUser = ctx.from!;

  // Remove buttons from the question message
  try {
    await ctx.api.editMessageReplyMarkup(ctx.chat!.id, pending.botMessageId, {
      reply_markup: { inline_keyboard: [] }
    });
  } catch { /* ignore */ }

  const processingMsg = await ctx.reply('🤖 Re-analyzing with your corrections...');

  try {
    const updatedAnalysis = await analyzeFoodImageWithContext(
      pending.base64Image!,
      pending.mimeType || 'image/jpeg',
      clarification
    );

    const analysis = updatedAnalysis || pending.analysis;

    // Advance to confirm step with the updated analysis
    updatePendingMeal(telegramUser.id, pending.botMessageId, {
      step: 'awaiting_confirm',
      analysis,
    });

    try { await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id); } catch { /* ignore */ }

    const previewText = formatMealPreview(analysis);
    await ctx.reply(previewText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Log Meal', callback_data: `confirm_meal_${pending.botMessageId}` },
          { text: '❌ Discard', callback_data: `discard_meal_${pending.botMessageId}` },
        ]],
      },
    });

  } catch (error) {
    console.error('Clarification re-analysis error:', error);
    try { await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id); } catch { /* ignore */ }

    // Fallback: show original analysis
    updatePendingMeal(telegramUser.id, pending.botMessageId, { step: 'awaiting_confirm' });
    const previewText = formatMealPreview(pending.analysis);
    await ctx.reply(previewText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Log Meal', callback_data: `confirm_meal_${pending.botMessageId}` },
          { text: '❌ Discard', callback_data: `discard_meal_${pending.botMessageId}` },
        ]],
      },
    });
  }
}

/**
 * Detects if the user is asking for food substitutions.
 * Returns the food name to find alternatives for, or null.
 */
function detectSubstitutionIntent(text: string): string | null {
  const lower = text.toLowerCase();

  const patterns = [
    /(?:alternative(?:s)? to|instead of|healthier (?:than|version of)|swap|replace|substitute for|what (?:can|should) i (?:eat|have) instead of)\s+([\w\s]{2,40})/i,
    /([\w\s]{2,30}) (?:alternative|substitute|swap|replacement)/i,
    /healthy(?:ier)? (?:version|option|choice) (?:of|for)\s+([\w\s]{2,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/** Converts a FastFoodItem to a VisionAnalysisResult so it flows through the same preview/confirm pipeline. */
function fastFoodToAnalysis(item: import('../services/fastFoodDb').FastFoodItem): import('../services/nutrition/visionFallback').VisionAnalysisResult {
  return {
    description: `${item.brand} ${item.name}`,
    cuisineType: item.brand,
    confidenceScore: 99,
    nutrition: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0,
      sodium: item.sodium || 0,
    },
    items: [{ name: item.name, portion: '1 serving', calories: item.calories }],
    mealScore: {
      overall: 5,
      pros: ['Known nutritional data'],
      cons: item.sodium && item.sodium > 800 ? ['High sodium'] : [],
    },
    aiFeedback: `Exact nutrition data from ${item.brand}'s official menu.`,
  };
}
