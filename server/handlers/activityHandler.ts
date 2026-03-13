import { Context } from 'grammy';
import { db } from '../services/db';

// MET values (Metabolic Equivalent of Task)
const MET_TABLE: Record<string, { met: number; label: string }> = {
  run:      { met: 9.8,  label: 'Running' },
  running:  { met: 9.8,  label: 'Running' },
  jog:      { met: 7.0,  label: 'Jogging' },
  jogging:  { met: 7.0,  label: 'Jogging' },
  walk:     { met: 3.5,  label: 'Walking' },
  walking:  { met: 3.5,  label: 'Walking' },
  swim:     { met: 7.0,  label: 'Swimming' },
  swimming: { met: 7.0,  label: 'Swimming' },
  bike:     { met: 7.5,  label: 'Cycling' },
  cycling:  { met: 7.5,  label: 'Cycling' },
  gym:      { met: 5.0,  label: 'Gym / Weight Training' },
  weights:  { met: 5.0,  label: 'Weight Training' },
  hiit:     { met: 10.0, label: 'HIIT' },
  yoga:     { met: 2.5,  label: 'Yoga' },
  pilates:  { met: 3.0,  label: 'Pilates' },
  jump:     { met: 10.0, label: 'Jump Rope' },
  dance:    { met: 5.5,  label: 'Dancing' },
  football: { met: 8.0,  label: 'Football / Soccer' },
  basketball:{ met: 8.0, label: 'Basketball' },
  tennis:   { met: 7.3,  label: 'Tennis' },
  climb:    { met: 5.8,  label: 'Stair Climbing' },
  stairs:   { met: 5.8,  label: 'Stair Climbing' },
  hike:     { met: 6.0,  label: 'Hiking' },
  row:      { met: 7.0,  label: 'Rowing' },
  elliptical:{ met: 5.0, label: 'Elliptical' },
  crossfit: { met: 10.0, label: 'CrossFit' },
};

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
    const { entries, totalBurned } = await db.getActivityForDate(user.id, new Date());
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

  const activity = MET_TABLE[activityType];
  
  if (!activity) {
    await ctx.reply(`Unknown activity type: *${activityType}*\n\nUse: run, walk, gym, swim, bike, hiit, yoga, dance, football...`, { parse_mode: 'Markdown' });
    return;
  }

  const weightKg = user.weight || 70;
  const caloriesBurned = Math.round(activity.met * weightKg * (durationMin / 60));
  
  await db.logActivity(user.id, activity.label, durationMin, caloriesBurned);

  const { totalBurned } = await db.getActivityForDate(user.id, new Date());
  const today = new Date().toISOString().split('T')[0];
  const summary = await db.getDailySummary(user.id, today);
  const eaten = Math.round(summary?.totalCalories || 0);
  const net = eaten - totalBurned;

  let msg = `✅ *Activity Logged*\n\n`;
  msg += `${activity.label} — ${durationMin} min\n`;
  msg += `🔥 Burned: *${caloriesBurned} kcal*\n\n`;
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
