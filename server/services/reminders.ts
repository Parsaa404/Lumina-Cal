import { Bot } from 'grammy';
import { db, supabase } from './db';

let checkInterval: ReturnType<typeof setInterval> | null = null;
let lastMorningDateStr = '';
let lastEveningDateStr = '';

export function startReminders(bot: Bot) {
  // Check every 30 minutes
  checkInterval = setInterval(() => checkAndSendReminders(bot), 30 * 60 * 1000);
  checkAndSendReminders(bot);
}

export function stopReminders() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

async function getActiveUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegramId, firstName, streak, dailyCalorieGoal, dailyProteinGoal, targetWeight, weight');
  if (error) { console.error('[Reminders] Failed to fetch users:', error); return []; }
  return data || [];
}

async function checkAndSendReminders(bot: Bot) {
  const now = new Date();
  const hour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];

  try {
    const users = await getActiveUsers();

    // ── 8 AM: Morning Briefing ───────────────────────────────
    if (hour === 8 && lastMorningDateStr !== todayStr) {
      lastMorningDateStr = todayStr;

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      for (const user of users) {
        try {
          const yesterdaySummary = await db.getDailySummary(user.id, yesterday);
          const yCal  = Math.round(yesterdaySummary?.totalCalories || 0);
          const yProt = Math.round(yesterdaySummary?.totalProtein || 0);

          let msg = `🌅 *Good morning, ${user.firstName}!*\n\n`;

          if (yCal > 0) {
            msg += `*Yesterday's summary:*\n`;
            msg += `🔥 ${yCal} kcal`;
            if (user.dailyCalorieGoal) {
              const diff = yCal - user.dailyCalorieGoal;
              msg += diff > 0 ? ` (${diff} over)` : ` (${Math.abs(diff)} under goal)`;
            }
            msg += `\n`;
            msg += `🥩 ${yProt}g protein\n`;
          }

          if (user.streak && user.streak > 1) {
            msg += `\n🔥 You're on a *${user.streak}-day streak!*`;
          }

          msg += `\n\n*Today's goal: ${user.dailyCalorieGoal || 2000} kcal*\nStart strong! Log your breakfast 🍳`;

          await bot.api.sendMessage(user.telegramId, msg, { parse_mode: 'Markdown' });
        } catch { /* user may have blocked bot */ }
      }

      console.log(`[Reminders] Morning briefings sent for ${todayStr}`);
    }

    // ── 8 PM: Evening reminder if no meals logged ────────────
    if (hour === 20 && lastEveningDateStr !== todayStr) {
      lastEveningDateStr = todayStr;

      for (const user of users) {
        try {
          const summary = await db.getDailySummary(user.id, todayStr);
          const hasMeals = summary && summary.meals.length > 0;

          if (!hasMeals) {
            let msg = `⏰ *Evening Check-in*\n\nHey ${user.firstName}! You haven't logged any meals today.`;
            if (user.streak && user.streak > 2) {
              msg += ` Don't break your *${user.streak}-day* streak 🔥`;
            }
            msg += `\n\nSnap a dinner photo or use /quickadd for your usual foods!`;
            await bot.api.sendMessage(user.telegramId, msg, { parse_mode: 'Markdown' });
          } else {
            // They logged meals — give a summary
            const totalCal = Math.round(summary.totalCalories);
            const goal = user.dailyCalorieGoal || 2000;
            const remaining = goal - totalCal;
            if (remaining > 100) {
              let msg = `🌙 *Evening Summary*\n\n`;
              msg += `You've eaten *${totalCal} kcal* today.\n`;
              msg += `You still have *${Math.round(remaining)} kcal* budget left.\n\n`;
              msg += remaining > 400
                ? `Consider a proper dinner if you haven't had one! 🍽️`
                : `A light snack like fruit or yogurt would be perfect 🍎`;
              await bot.api.sendMessage(user.telegramId, msg, { parse_mode: 'Markdown' });
            }
          }
        } catch { /* skip */ }
      }

      console.log(`[Reminders] Evening reminders sent for ${todayStr}`);
    }

  } catch (error) {
    console.error('[Reminders] Error:', error);
  }
}
