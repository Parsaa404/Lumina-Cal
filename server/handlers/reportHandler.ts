import { Context } from 'grammy';
import { db } from '../services/db';

// ── /report — text-based monthly summary ─────────────────────
// Note: PDF generation requires pdfkit (install when server is stopped: npm install pdfkit)
// For now this generates a rich text monthly report that can be saved/forwarded.
export async function handleReport(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply('📄 Generating your monthly report...');

  try {
    // Last 30 days
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
    }

    const summaries = await Promise.all(days.map(async (day) => {
      const s = await db.getDailySummary(user.id, day);
      return {
        day,
        calories: Math.round(s?.totalCalories || 0),
        protein: Math.round(s?.totalProtein || 0),
        water: s?.waterAmount || 0,
        meals: s?.meals?.length || 0,
        burned: Math.round(s?.caloriesBurned || 0),
      };
    }));

    const logged = summaries.filter(d => d.meals > 0);
    const avgCal  = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
    const avgProt = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : 0;
    const avgWater = logged.length ? Math.round(logged.reduce((s, d) => s + d.water, 0) / logged.length) : 0;
    const totalBurned = summaries.reduce((s, d) => s + d.burned, 0);
    const totalMeals  = summaries.reduce((s, d) => s + d.meals, 0);
    const calGoal = user.dailyCalorieGoal || 2000;
    const onGoalDays = logged.filter(d => Math.abs(d.calories - calGoal) < 200).length;

    // Weight change
    const wh = await db.getWeightHistory(user.id);
    let weightChange = '';
    if (wh.length >= 2) {
      const delta = parseFloat((wh[wh.length - 1].weight - wh[0].weight).toFixed(1));
      weightChange = `${delta > 0 ? '+' : ''}${delta}kg`;
    }

    // Build report
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let msg = `📊 *Monthly Report — ${month}*\n\n`;
    msg += `👤 *${user.firstName}*  |  Goal: ${user.fitnessGoal || 'healthy lifestyle'}\n`;
    msg += `${'─'.repeat(32)}\n\n`;
    msg += `📅 *Logging Stats*\n`;
    msg += `  Days logged:     ${logged.length}/30\n`;
    msg += `  Total meals:     ${totalMeals}\n`;
    msg += `  On-goal days:    ${onGoalDays}\n`;
    msg += `  Logging streak:  ${user.streak || 0} days 🔥\n\n`;
    msg += `🍽️ *Nutrition Averages*\n`;
    msg += `  Calories:  ${avgCal} kcal/day (goal: ${calGoal})\n`;
    msg += `  Protein:   ${avgProt}g/day\n`;
    msg += `  Water:     ${avgWater}ml/day\n\n`;
    msg += `🏃 *Fitness*\n`;
    msg += `  Total burned:  ${totalBurned} kcal\n`;
    if (weightChange) msg += `  Weight change: ${weightChange}\n`;
    msg += `\n`;

    // Top calorie days
    const topDays = [...logged].sort((a, b) => b.calories - a.calories).slice(0, 3);
    if (topDays.length > 0) {
      msg += `🔥 *Highest Calorie Days*\n`;
      topDays.forEach(d => {
        msg += `  ${d.day}: ${d.calories} kcal\n`;
      });
      msg += '\n';
    }

    // Simple weekly breakdown
    msg += `📆 *Weekly Averages*\n`;
    for (let week = 0; week < 4; week++) {
      const weekDays = summaries.slice(week * 7, (week + 1) * 7).filter(d => d.meals > 0);
      if (weekDays.length === 0) continue;
      const wAvg = Math.round(weekDays.reduce((s, d) => s + d.calories, 0) / weekDays.length);
      msg += `  Week ${week + 1}: ${wAvg} kcal/day avg\n`;
    }

    msg += `\n_Use /coach for a personalized AI analysis_`;

    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Report error:', err);
    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, '❌ Failed to generate report. Please try again.');
  }
}
