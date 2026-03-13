import { Context } from 'grammy';
import { db } from '../services/db';
import { logActivity, getTodayActivity } from '../services/activityStore';

// Usage: /activity run 30  or  /activity gym 60
export async function handleActivity(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const text = ctx.message?.text || '';
  const parts = text.trim().toLowerCase().split(/\s+/);
  // parts: ['/activity', 'run', '30']
  const activityType = parts[1];
  const durationMin = parts[2] ? parseInt(parts[2]) : null;

  // Show usage if incomplete
  if (!activityType || !durationMin || isNaN(durationMin)) {
    const { entries, totalBurned } = getTodayActivity(telegramUser.id);
    let msg = `🏃 *Activity Tracker*\n\n`;
    msg += `Usage: \`/activity [type] [minutes]\`\n\n`;
    msg += `Examples:\n`;
    msg += `• \`/activity run 30\`\n`;
    msg += `• \`/activity gym 60\`\n`;
    msg += `• \`/activity walk 45\`\n\n`;
    msg += `Supported: run, jog, walk, swim, bike, gym, hiit, yoga, pilates, dance, football, basketball, tennis, hike, crossfit\n\n`;

    if (entries.length > 0) {
      msg += `*Today's Activity:*\n`;
      for (const e of entries) {
        msg += `  • ${e.type} ${e.durationMin}min — ${e.caloriesBurned} kcal burned\n`;
      }
      msg += `Total burned: *${totalBurned} kcal*`;
    }
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  const weightKg = user.weight || 70;
  const entry = logActivity(telegramUser.id, activityType, durationMin, weightKg);

  if (!entry) {
    await ctx.reply(`Unknown activity type: *${activityType}*\n\nUse: run, walk, gym, swim, bike, hiit, yoga, dance, football...`, { parse_mode: 'Markdown' });
    return;
  }

  const { totalBurned } = getTodayActivity(telegramUser.id);
  const today = new Date().toISOString().split('T')[0];
  const summary = await db.getDailySummary(user.id, today);
  const eaten = Math.round(summary?.totalCalories || 0);
  const net = eaten - totalBurned;

  let msg = `✅ *Activity Logged*\n\n`;
  msg += `${entry.type} — ${durationMin} min\n`;
  msg += `🔥 Burned: *${entry.caloriesBurned} kcal*\n\n`;
  msg += `*Daily Balance:*\n`;
  msg += `  Eaten:    ${eaten} kcal\n`;
  msg += `  Burned:   ${totalBurned} kcal\n`;
  msg += `  Net:      *${net} kcal*\n`;

  if (user.dailyCalorieGoal) {
    const adjustedGoal = user.dailyCalorieGoal + totalBurned;
    const remaining = adjustedGoal - eaten;
    if (remaining > 0) {
      msg += `\n✅ You can eat *${Math.round(remaining)} more kcal* today (accounting for activity)`;
    } else {
      msg += `\n⚠️ You've exceeded your adjusted goal.`;
    }
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
