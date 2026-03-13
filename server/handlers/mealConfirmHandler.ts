import { Context } from 'grammy';
import { db } from '../services/db';
import { getPendingMeal, deletePendingMeal, updatePendingMeal } from './pendingMealState';
import { formatMealPreview, formatMealConfirmed } from './mealReplyFormatter';

/**
 * Handles:
 *   skip_clarify_{botMessageId}   — user tapped "Looks correct", skip re-analysis
 *   confirm_meal_{botMessageId}   — user confirmed logging
 *   discard_meal_{botMessageId}   — user discarded the meal
 */
export async function handleMealConfirmCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // ── Skip Clarification ──
  if (data.startsWith('skip_clarify_')) {
    const botMessageId = parseInt(data.replace('skip_clarify_', ''));
    if (isNaN(botMessageId)) return;

    const pending = getPendingMeal(telegramUser.id, botMessageId);
    if (!pending) {
      await ctx.answerCallbackQuery({ text: '⏰ Session expired. Please resend the photo.' });
      return;
    }

    await ctx.answerCallbackQuery({ text: '✅ Looks good!' });

    // Advance to confirm step
    updatePendingMeal(telegramUser.id, botMessageId, { step: 'awaiting_confirm' });

    const previewText = formatMealPreview(pending.analysis);
    try {
      await ctx.editMessageText(previewText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Log Meal', callback_data: `confirm_meal_${botMessageId}` },
            { text: '❌ Discard', callback_data: `discard_meal_${botMessageId}` },
          ]],
        },
      });
    } catch { /* ignore */ }
    return;
  }

  // ── Discard ──
  if (data.startsWith('discard_meal_')) {
    const botMessageId = parseInt(data.replace('discard_meal_', ''));
    if (isNaN(botMessageId)) return;

    await ctx.answerCallbackQuery({ text: '❌ Meal discarded' });
    deletePendingMeal(telegramUser.id, botMessageId);

    try {
      await ctx.editMessageText('❌ Meal discarded.', { reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore */ }
    return;
  }

  // ── Confirm ──
  if (data.startsWith('confirm_meal_')) {
    const botMessageId = parseInt(data.replace('confirm_meal_', ''));
    if (isNaN(botMessageId)) return;

    const pending = getPendingMeal(telegramUser.id, botMessageId);

    if (!pending) {
      await ctx.answerCallbackQuery({ text: '⏰ Session expired. Please resend the photo.' });
      try {
        await ctx.editMessageText('⏰ Session expired. Please send the food again.', {
          reply_markup: { inline_keyboard: [] }
        });
      } catch { /* ignore */ }
      return;
    }

    await ctx.answerCallbackQuery({ text: '✅ Meal logged!' });

    const { analysis, userId, telegramMessageId, photoUrl } = pending;

    // Update streak and log meal
    const streak = await db.updateStreak(telegramUser.id);

    await db.logMeal({
      userId,
      telegramMessageId,
      description: analysis.description,
      photoUrl,
      nutrition: analysis.nutrition,
      mealScore: analysis.mealScore,
      aiFeedback: analysis.aiFeedback,
      loggedAt: new Date().toISOString(),
      cuisineType: analysis.cuisineType,
      confidenceScore: analysis.confidenceScore,
    });

    deletePendingMeal(telegramUser.id, botMessageId);

    const user = await db.getUser(telegramUser.id);
    const today = new Date().toISOString().split('T')[0];
    const summary = user ? await db.getDailySummary(user.id, today) : null;

    const confirmedText = formatMealConfirmed(analysis, user!, summary, streak);

    try {
      await ctx.editMessageText(confirmedText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] },
      });
    } catch (error) {
      console.error('Error updating confirmed meal message:', error);
    }
    return;
  }
}
