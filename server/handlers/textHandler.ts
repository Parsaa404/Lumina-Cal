import { Context } from 'grammy';
import { db } from '../services/db';
import { analyzeFoodText, analyzeFoodImageWithContext } from '../services/nutrition/visionFallback';
import { isOnboarding } from './onboardingState';
import { handleOnboardingText } from './onboardingHandler';
import { formatMealPreview } from './mealReplyFormatter';
import { setPendingMeal, hasActivePending, getActivePending, updatePendingMeal, PendingMeal } from './pendingMealState';
import { getCachedFood, setCachedFood } from '../services/foodCache';

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

  // ── Clarification reply for a pending photo analysis ──
  if (hasActivePending(telegramUser.id)) {
    const pending = getActivePending(telegramUser.id)!;
    if (pending.step === 'awaiting_clarification' && pending.base64Image) {
      await handleClarificationReply(ctx, text, pending);
      return;
    }
  }

  // ── Normal text meal logging ──
  const user = await db.getUser(telegramUser.id);
  if (!user) {
    await ctx.reply('Please use /start first to register.');
    return;
  }

  const message = await ctx.reply('🔍 Analyzing your meal... Please wait.');

  try {
    let analysis = getCachedFood(text);
    let fromCache = false;

    if (analysis) {
      fromCache = true;
    } else {
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
    if (fromCache) previewText += `\n\n⚡ _Instant result (cached)_`;

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
