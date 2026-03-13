import { Context } from 'grammy';
import { db } from '../services/db';
import { generateMetabolicAdjustment } from '../services/nutrition/aiRecommendations';

// In-memory weight log per user per week
const weightLog = new Map<string, { weight: number; date: string; timestamp: number }[]>();

function getUserKey(telegramId: number): string {
  return `wl_${telegramId}`;
}

export async function handleWeight(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  // Parse weight from command: /weight 82.5
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);
  const weightArg = parts[1] ? parseFloat(parts[1]) : null;

  if (!weightArg || isNaN(weightArg) || weightArg < 20 || weightArg > 500) {
    await ctx.reply(
      `⚖️ *Weekly Weight Check-in*\n\nLog your current weight to track progress and get adaptive calorie adjustments.\n\nUsage: \`/weight 82.5\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const key = getUserKey(telegramUser.id);
  const logs = weightLog.get(key) || [];
  const today = new Date().toISOString().split('T')[0];

  // Don't duplicate on same day
  const alreadyToday = logs.find(l => l.date === today);
  if (!alreadyToday) {
    logs.push({ weight: weightArg, date: today, timestamp: Date.now() });
    // Keep last 12 weeks
    while (logs.length > 12) logs.shift();
    weightLog.set(key, logs);
  }

  const loadingMsg = await ctx.reply('🧠 Analyzing your weight trend...');

  try {
    // Need at least 2 data points for adaptation
    if (logs.length < 2) {
      await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
        `✅ *Weight logged: ${weightArg}kg*\n\nLog again next week to get adaptive calorie recommendations!`,
        { parse_mode: 'Markdown' });
      return;
    }

    const prev = logs[logs.length - 2];
    const curr = logs[logs.length - 1];
    const weekChange = parseFloat((curr.weight - prev.weight).toFixed(1));
    const fitnessGoal = user.fitnessGoal || 'healthy_lifestyle';

    // AI metabolic adjustment
    const adjustment = await generateMetabolicAdjustment({
      fitnessGoal,
      currentWeight: weightArg,
      previousWeight: prev.weight,
      weeklyChange: weekChange,
      currentCalories: user.dailyCalorieGoal || 2000,
      currentCarbs: user.dailyCarbsGoal || 200,
    });

    let msg = `⚖️ *Weekly Weight Check-in*\n\n`;
    msg += `Current: *${weightArg}kg*\n`;
    msg += `Last week: ${prev.weight}kg\n`;
    msg += `Change: *${weekChange > 0 ? '+' : ''}${weekChange}kg*\n\n`;
    msg += adjustment;

    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
    });

    // If adjustments recommended, apply them to user goals
    // (this would update Supabase in a production build)
  } catch (error) {
    console.error('Weight handler error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      `✅ Weight logged: ${weightArg}kg. Continue tracking next week for adaptive recommendations!`);
  }
}

export function getWeightHistory(telegramId: number) {
  return weightLog.get(getUserKey(telegramId)) || [];
}
