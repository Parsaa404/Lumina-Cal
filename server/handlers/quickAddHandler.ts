import { Context } from 'grammy';
import { db } from '../services/db';
import { searchFood } from '../core/food/foodService';
import { formatMealPreview } from './mealReplyFormatter';
import { setPendingMeal } from './pendingMealState';

/**
 * /quickadd — shows user's top 6 most-logged foods as one-tap inline buttons.
 */
export async function handleQuickAdd(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const meals = await db.getWeeklyMeals(user.id);

  if (meals.length === 0) {
    await ctx.reply(
      '📝 *Quick Add*\n\nNo meals logged yet.\nSend a photo or type what you ate to get started!',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Count food frequency
  const foodCount = new Map<string, number>();
  for (const meal of meals) {
    const key = meal.description.split('(')[0].trim().slice(0, 30);
    foodCount.set(key, (foodCount.get(key) || 0) + 1);
  }

  const topFoods = [...foodCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (topFoods.length === 0) {
    await ctx.reply('No recent foods found. Start logging!');
    return;
  }

  // Build 2-per-row inline keyboard
  const buttons = [];
  for (let i = 0; i < topFoods.length; i += 2) {
    const row = [];
    const [n1, c1] = topFoods[i];
    row.push({ text: `${n1} (×${c1})`, callback_data: `quickadd_${encodeFood(n1)}` });
    if (topFoods[i + 1]) {
      const [n2, c2] = topFoods[i + 1];
      row.push({ text: `${n2} (×${c2})`, callback_data: `quickadd_${encodeFood(n2)}` });
    }
    buttons.push(row);
  }

  await ctx.reply(
    '⚡ *Quick Add*\n\nTap a recent food to log it instantly:',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } }
  );
}

/**
 * Handles quickadd_<food> callback — looks up nutrition and shows confirm preview.
 */
export async function handleQuickAddCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const data      = ctx.callbackQuery?.data || '';
  const foodName  = decodeFood(data.replace('quickadd_', ''));

  await ctx.answerCallbackQuery({ text: `Looking up ${foodName}...` });

  const user = await db.getUser(telegramUser.id);
  if (!user) return;

  const loadingMsg = await ctx.reply(`🔍 Looking up *${foodName}*...`, { parse_mode: 'Markdown' });

  try {
    const result = await searchFood(foodName);
    if (!result) {
      await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
        `Could not find nutrition for "${foodName}". Try typing it manually.`);
      return;
    }

    setPendingMeal(telegramUser.id, {
      step: 'awaiting_confirm',
      analysis: result.item,
      userId: user.id,
      botMessageId: loadingMsg.message_id,
    });

    const sourceLabel = result.source === 'database' ? '\n\n🏪 _Fast food database — highly accurate_'
      : result.source === 'cache' ? '\n\n⚡ _Cached result_' : '';

    await ctx.api.editMessageText(
      ctx.chat?.id as number, loadingMsg.message_id,
      formatMealPreview(result.item) + sourceLabel,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Log Meal', callback_data: `confirm_meal_${loadingMsg.message_id}` },
            { text: '❌ Discard',  callback_data: `discard_meal_${loadingMsg.message_id}` },
          ]],
        },
      }
    );
  } catch (err) {
    console.error('QuickAdd error:', err);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      'Could not look up that food. Try typing it manually.');
  }
}

// URL-safe encode/decode for Telegram callback_data (max 64 bytes)
function encodeFood(name: string): string {
  return encodeURIComponent(name.slice(0, 20)).slice(0, 40);
}
function decodeFood(encoded: string): string {
  try { return decodeURIComponent(encoded); } catch { return encoded; }
}
