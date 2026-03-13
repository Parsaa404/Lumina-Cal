import { Context } from 'grammy';
import { analyzeFoodImageWithContext } from '../services/nutrition/visionFallback';
import { getActivePending, getPendingMeal, updatePendingMeal } from './pendingMealState';
import { formatMealPreview } from './mealReplyFormatter';

/**
 * Handles:
 *  photo_cook_{botMsgId}_{method}     → saves cooking method, asks Q2 (seasonings)
 *  photo_season_{botMsgId}_{answer}   → saves seasonings, asks Q3 (portions)
 *
 * Text responses are also caught here via handlePhotoTextAnswer().
 */

// ── Q1 callback: cooking method ─────────────────────────────────────────────
export async function handlePhotoCookingCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';
  const [, , rawId, ...rest] = data.split('_');  // "photo_cook_12345_grilled"
  const botMessageId = parseInt(rawId);
  const method = rest.join('_');
  if (isNaN(botMessageId)) return;

  const telegramUser = ctx.from!;
  const pending = getPendingMeal(telegramUser.id, botMessageId);
  if (!pending) { await ctx.answerCallbackQuery({ text: '⏰ Session expired. Please resend the photo.' }); return; }

  await ctx.answerCallbackQuery({ text: `${method} ✅` });
  updatePendingMeal(telegramUser.id, botMessageId, { step: 'q_seasoning', cookingMethod: method });

  const label = method.charAt(0).toUpperCase() + method.slice(1);
  await ctx.api.editMessageText(
    ctx.chat!.id, botMessageId,
    `✅ *Cooking: ${label}*\n\n2️⃣ *Any seasonings or sauces?*\n_e.g. olive oil, butter, soy sauce, ketchup, none_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🫒 Olive oil', callback_data: `photo_season_${botMessageId}_olive oil` },
            { text: '🧈 Butter',    callback_data: `photo_season_${botMessageId}_butter` },
          ],
          [
            { text: '🥫 Sauce',     callback_data: `photo_season_${botMessageId}_sauce` },
            { text: '🧂 Salt only', callback_data: `photo_season_${botMessageId}_salt only` },
            { text: '❌ None',      callback_data: `photo_season_${botMessageId}_none` },
          ],
          [{ text: '⌨️ Type my own...', callback_data: `photo_season_${botMessageId}_typing` }],
        ],
      },
    }
  );
}

// ── Q2 callback: seasonings ──────────────────────────────────────────────────
export async function handlePhotoSeasoningCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';
  // format: photo_season_{botMsgId}_{value}
  const parts = data.split('_');
  // parts[0]=photo parts[1]=season parts[2]=botMsgId parts[3..n]=value
  const botMessageId = parseInt(parts[2]);
  const value = parts.slice(3).join('_');
  if (isNaN(botMessageId)) return;

  const telegramUser = ctx.from!;
  const pending = getPendingMeal(telegramUser.id, botMessageId);
  if (!pending) { await ctx.answerCallbackQuery({ text: '⏰ Session expired.' }); return; }

  if (value === 'typing') {
    await ctx.answerCallbackQuery({ text: 'Type your answer below 👇' });
    await ctx.api.editMessageText(ctx.chat!.id, botMessageId,
      `✅ *Cooking: ${pending.cookingMethod}*\n\n2️⃣ *Any seasonings or sauces?*\n_Just type your answer below (e.g. "2 tbsp olive oil, garlic"):_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.answerCallbackQuery({ text: `${value} ✅` });
  updatePendingMeal(telegramUser.id, botMessageId, { step: 'q_portions', seasonings: value });
  await askQ3(ctx, botMessageId, pending.cookingMethod!, value);
}

async function askQ3(ctx: Context, botMessageId: number, cooking: string, season: string) {
  await ctx.api.editMessageText(
    ctx.chat!.id, botMessageId,
    `✅ *Cooking: ${cooking}*\n✅ *Seasonings: ${season}*\n\n3️⃣ *How many grams of each item?*\n_e.g. "chicken 150g, rice 1 cup, salad 80g"_\n\nJust type your answer below 👇`,
    { parse_mode: 'Markdown' }
  );
}

// ── Text responder during Q&A steps ─────────────────────────────────────────
export async function handlePhotoTextAnswer(ctx: Context): Promise<boolean> {
  const telegramUser = ctx.from;
  if (!telegramUser) return false;

  const pending = getActivePending(telegramUser.id);
  if (!pending) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  const { step, botMessageId } = pending;

  if (step === 'q_seasoning') {
    updatePendingMeal(telegramUser.id, botMessageId, { step: 'q_portions', seasonings: text });
    // Acknowledge and ask Q3
    try { await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id); } catch { /* ignore */ }
    await askQ3(ctx, botMessageId, pending.cookingMethod || 'unknown', text);
    return true;
  }

  if (step === 'q_portions') {
    updatePendingMeal(telegramUser.id, botMessageId, { portions: text, step: 'awaiting_confirm' });
    try { await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id); } catch { /* ignore */ }
    await finalizeWithContext(ctx, telegramUser.id, botMessageId);
    return true;
  }

  return false;
}

// ── Final re-analysis with full context ──────────────────────────────────────
async function finalizeWithContext(ctx: Context, telegramId: number, botMessageId: number) {
  const pending = getPendingMeal(telegramId, botMessageId);
  if (!pending) return;

  const { base64Image, mimeType, cookingMethod, seasonings, portions, analysis } = pending;

  await ctx.api.editMessageText(ctx.chat!.id, botMessageId,
    '🤖 *Re-analyzing with your details...*', { parse_mode: 'Markdown' });

  let finalAnalysis = analysis;

  if (base64Image && mimeType) {
    const context = [
      cookingMethod && cookingMethod !== 'none' ? `Cooking method: ${cookingMethod}` : '',
      seasonings    && seasonings    !== 'none' ? `Seasonings/sauces: ${seasonings}` : '',
      portions ? `Portions: ${portions}` : '',
    ].filter(Boolean).join('. ');

    try {
      const refined = await analyzeFoodImageWithContext(base64Image, mimeType, context);
      if (refined) finalAnalysis = refined;
    } catch (err) {
      console.error('Re-analysis failed, using initial result:', err);
    }
  }

  updatePendingMeal(telegramId, botMessageId, { analysis: finalAnalysis, step: 'awaiting_confirm' });

  const preview = formatMealPreview(finalAnalysis);
  await ctx.api.editMessageText(
    ctx.chat!.id, botMessageId,
    preview,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Log Meal', callback_data: `confirm_meal_${botMessageId}` },
          { text: '❌ Discard',  callback_data: `discard_meal_${botMessageId}` },
        ]],
      },
    }
  );
}
