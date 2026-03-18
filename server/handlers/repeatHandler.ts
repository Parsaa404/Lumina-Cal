import { Context, InlineKeyboard } from 'grammy';
import { db } from '../services/db';

// ── /repeat — re-log a recent meal ───────────────────────────
export async function handleRepeat(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  // Fetch last 7 days of meals
  const recentMeals = await db.getWeeklyMeals(user.id);

  if (!recentMeals || recentMeals.length === 0) {
    await ctx.reply(
      `🔄 *Meal Repeat*\n\nNo recent meals found. Log some meals first and come back!`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Deduplicate by description, keep most recent of each
  const seen = new Set<string>();
  const unique = recentMeals.filter(m => {
    const key = m.description.substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);

  let msg = `🔄 *Repeat a Recent Meal*\n\nTap any meal to log it again instantly:`;
  const kb = new InlineKeyboard();

  unique.forEach((meal, i) => {
    const cal = Math.round(meal.nutrition?.calories || 0);
    const label = `${meal.description.substring(0, 28)} (${cal} kcal)`;
    kb.text(label, `repeat_log_${i}`);
    if (i % 2 === 1) kb.row();
  });

  // Store the meals in a temp map for callback access
  pendingRepeat.set(telegramUser.id, unique);

  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
}

// Temp store for repeat meal selections
const pendingRepeat = new Map<number, any[]>();

export async function handleRepeatCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;
  await ctx.answerCallbackQuery();

  const data = ctx.callbackQuery?.data || '';
  if (!data.startsWith('repeat_log_')) return;

  const idx = parseInt(data.replace('repeat_log_', ''));
  const meals = pendingRepeat.get(telegramUser.id);
  if (!meals || !meals[idx]) {
    await ctx.editMessageText('⏰ Session expired. Use /repeat again.', { reply_markup: { inline_keyboard: [] } });
    return;
  }

  const meal = meals[idx];
  const user = await db.getUser(telegramUser.id);
  if (!user) return;

  const streak = await db.updateStreak(telegramUser.id);

  await db.logMeal({
    userId: user.id,
    telegramMessageId: ctx.callbackQuery?.message?.message_id || 0,
    description: meal.description,
    photoUrl: undefined,
    nutrition: meal.nutrition,
    loggedAt: new Date().toISOString(),
    cuisineType: meal.cuisineType,
    confidenceScore: 100,
  });

  pendingRepeat.delete(telegramUser.id);

  const { buildProgressBar } = await import('./mealReplyFormatter');
  const today = new Date().toISOString().split('T')[0];
  const summary = await db.getDailySummary(user.id, today);
  const totalCal = Math.round(summary?.totalCalories || 0);
  const calGoal  = user.dailyCalorieGoal || 2000;

  let msg = `✅ *${meal.description.substring(0, 50)}* logged!\n\n`;
  msg += `🔥 Cal  ${buildProgressBar(totalCal, calGoal)}\n`;
  if (streak > 1) msg += `\n🔥 ${streak}-day streak!`;

  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [] }
  });
}
