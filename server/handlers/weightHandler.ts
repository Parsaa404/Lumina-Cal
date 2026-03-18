import { Context } from 'grammy';
import { db } from '../services/db';
import { generateMetabolicAdjustment } from '../services/nutrition/aiRecommendations';

export async function handleWeight(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  // Parse weight from command: /weight 82.5
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);
  const weightKg = parts[1] ? parseFloat(parts[1]) : null;

  // No argument — show instructions
  if (!weightKg || isNaN(weightKg) || weightKg < 20 || weightKg > 500) {
    const history = await db.getWeightHistory(user.id);
    const lastLog = history.length > 0 ? history[history.length - 1] : null;
    let msg = `⚖️ *Weekly Weight Check-in*\n\n`;
    if (lastLog) msg += `Last logged: *${lastLog.weight}kg*\n\n`;
    msg += `Usage: \`/weight 82.5\``;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  // Log the weight — also update users.weight for dashboard
  await db.logWeight(user.id, weightKg);
  await db.updateUserProfile(telegramUser.id, { weight: weightKg });

  const loadingMsg = await ctx.reply('🧠 Analyzing your weight trend...');

  try {
    const logs = await db.getWeightHistory(user.id);

    if (logs.length < 2) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        loadingMsg.message_id,
        `✅ *Weight logged: ${weightKg}kg*\n\nLog again next week to get adaptive calorie recommendations!`,
        { parse_mode: 'Markdown' }
      );
    } else {
      const prev = logs[logs.length - 2];
      const curr = logs[logs.length - 1];
      const weekChange = parseFloat((curr.weight - prev.weight).toFixed(1));

      const adjustment = await generateMetabolicAdjustment({
        fitnessGoal: user.fitnessGoal || 'healthy_lifestyle',
        currentWeight: weightKg,
        previousWeight: prev.weight,
        weeklyChange: weekChange,
        currentCalories: user.dailyCalorieGoal || 2000,
        currentCarbs: user.dailyCarbsGoal || 200,
      });

      let msg = `⚖️ *Weekly Weight Check-in*\n\n`;
      msg += `Current: *${weightKg}kg*\n`;
      msg += `Last week: ${prev.weight}kg\n`;
      msg += `Change: *${weekChange > 0 ? '+' : ''}${weekChange}kg*\n\n`;
      msg += adjustment;

      // ETA to target
      if (user.targetWeight && weekChange !== 0) {
        const remaining = user.targetWeight - weightKg;
        const weeksToGoal = Math.abs(remaining / weekChange);
        if (weeksToGoal > 0 && weeksToGoal < 200) {
          const eta = new Date();
          eta.setDate(eta.getDate() + Math.ceil(weeksToGoal) * 7);
          const etaStr = eta.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          msg += `\n📅 *ETA to ${user.targetWeight}kg:* ~${etaStr} (${Math.ceil(weeksToGoal)} weeks)\n`;
        }
      }

      await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, msg, {
        parse_mode: 'Markdown',
      });
    }

    // ── Target weight achievement check ──
    if (user.targetWeight) {
      const goal = user.fitnessGoal || '';
      const achieved =
        (goal === 'weight_loss' && weightKg <= user.targetWeight) ||
        (goal === 'muscle_building' && weightKg >= user.targetWeight) ||
        weightKg === user.targetWeight;

      if (achieved) {
        // Clear the target so next open of dashboard shows "Not set"
        await db.updateUserGoals(telegramUser.id, { targetWeight: null as any });
        await ctx.reply(
          `🎉 *Goal Achieved!*\n\nYou reached your target weight of *${user.targetWeight}kg*! ✅\n\nSet a new goal with:\n\`/target [weight]\``,
          { parse_mode: 'Markdown' }
        );
      }
    }
  } catch (err) {
    console.error('Weight handler error:', err);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      loadingMsg.message_id,
      `✅ Weight logged: ${weightKg}kg. Check again next week for adaptive recommendations!`
    );
  }
}

export async function getWeightHistory(telegramId: number) {
  const user = await db.getUser(telegramId);
  if (!user) return [];
  return db.getWeightHistory(user.id);
}
