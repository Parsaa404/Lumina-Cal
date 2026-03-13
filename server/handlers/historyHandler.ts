import { Context } from 'grammy';
import { db } from '../services/db';
import { MealLog } from '../../shared/types';

export async function handleHistory(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const msg = await ctx.reply('📊 Analyzing your food history...');

  try {
    const meals = await db.getWeeklyMeals(user.id);

    if (meals.length === 0) {
      await ctx.api.editMessageText(ctx.chat?.id as number, msg.message_id,
        'No meals found this week. Start logging to see your food history!');
      return;
    }

    // ── Top foods by frequency ──
    const foodCount = new Map<string, number>();
    const foodCalories = new Map<string, number>();
    const foodSugar = new Map<string, number>();
    const foodProtein = new Map<string, number>();

    for (const meal of meals) {
      const key = meal.description.split('(')[0].trim(); // strip portion hints
      foodCount.set(key, (foodCount.get(key) || 0) + 1);
      foodCalories.set(key, (foodCalories.get(key) || 0) + meal.nutrition.calories);
      foodSugar.set(key, (foodSugar.get(key) || 0) + (meal.nutrition.sugar || 0));
      foodProtein.set(key, (foodProtein.get(key) || 0) + meal.nutrition.protein);
    }

    const topFoods = [...foodCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const mostCalorieDense = [...foodCalories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topSugarSources = [...foodSugar.entries()]
      .filter(([, v]) => v > 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topProteinSources = [...foodProtein.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // ── Meal timing ──
    const mealHours = meals.map(m => new Date(m.loggedAt).getHours());
    const lateNight = mealHours.filter(h => h >= 22 || h < 4).length;
    const avgHour = Math.round(mealHours.reduce((a, b) => a + b, 0) / mealHours.length);

    // ── Build message ──
    let reply = `📊 *Food History — Last 7 Days*\n\n`;

    reply += `*🏆 Top Foods:*\n`;
    for (const [name, count] of topFoods) {
      reply += `  ${count}×  ${truncate(name, 30)}\n`;
    }

    reply += `\n*🔥 Highest Calorie Foods:*\n`;
    for (const [name, cals] of mostCalorieDense) {
      reply += `  ${truncate(name, 28)} — ${Math.round(cals)} kcal total\n`;
    }

    if (topSugarSources.length > 0) {
      reply += `\n*🍬 Top Sugar Sources:*\n`;
      for (const [name, sugar] of topSugarSources) {
        reply += `  ${truncate(name, 28)} — ${Math.round(sugar)}g sugar\n`;
      }
    }

    reply += `\n*🥩 Best Protein Sources:*\n`;
    for (const [name, prot] of topProteinSources) {
      reply += `  ${truncate(name, 28)} — ${Math.round(prot)}g protein\n`;
    }

    reply += `\n*⏰ Meal Timing:*\n`;
    reply += `  Avg meal time: ${formatHour(avgHour)}\n`;
    if (lateNight > 0) {
      reply += `  ⚠️ Late-night eating (after 10pm): ${lateNight} time${lateNight > 1 ? 's' : ''}\n`;
      reply += `  _Tip: Try moving dinner before 9pm to improve sleep quality_\n`;
    }

    await ctx.api.editMessageText(ctx.chat?.id as number, msg.message_id, reply, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('History error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, msg.message_id,
      'Failed to load history. Please try again.');
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function formatHour(h: number): string {
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h % 12 || 12;
  return `${display}:00 ${suffix}`;
}
