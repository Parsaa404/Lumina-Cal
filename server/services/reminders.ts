import { Bot } from 'grammy';
import { db } from './db';

/**
 * Very simple cron alternative using setInterval.
 * Checks every hour to see if it should send reminders.
 */

let checkInterval: ReturnType<typeof setInterval> | null = null;
let lastReminderDateStr = '';

export function startReminders(bot: Bot) {
  // Check every hour (3600000 ms)
  // For testing, we could check every minute (60000 ms), but keeping it 1h for prod.
  checkInterval = setInterval(() => checkAndSendReminders(bot), 3600000);
  
  // Also run a check right away (but it will only send if conditions met and not already sent today)
  checkAndSendReminders(bot);
}

export function stopReminders() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

async function checkAndSendReminders(bot: Bot) {
  const now = new Date();
  const hour = now.getHours();
  
  // We only send the evening reminder at 8 PM (20:00) window.
  // The interval checks every hour.
  if (hour !== 20) return;

  const todayStr = now.toISOString().split('T')[0];
  
  // Prevent sending multiple times the same day if the server restarts or intervals shift
  if (lastReminderDateStr === todayStr) return;
  
  try {
    // Get all users who have interacted with the bot
    // Since we don't have a direct "getAllUsers" method in our db.ts, 
    // we would need a raw query to fetch all user ids.
    // Assuming db.ts is modified, or we can use the raw db instance here:
    
    // Instead of querying all users (which could be huge), for an MVP we can fetch active users.
    // Let's add an raw SQLite query here safely:
    const stmt = (db as any).db.prepare('SELECT id, telegram_id, fast_streak FROM users');
    const users = stmt.all();

    for (const user of users) {
      // Check if user logged any meals today
      const todaySummary = await db.getDailySummary(user.id, todayStr);
      
      const hasMeals = todaySummary && todaySummary.meals.length > 0;
      
      if (!hasMeals) {
        let msg = `⏰ *Evening Reminder*\n\nYou haven't logged any meals today!`;
        
        if (user.fast_streak > 2) {
          msg += ` Don't break your ${user.fast_streak}-day tracking streak 🔥`;
        }
        
        msg += `\n\nTake 30 seconds to snap a photo of your dinner or use /quickadd to instantly log your usuals.`;
        
        try {
          await bot.api.sendMessage(user.telegram_id, msg, { parse_mode: 'Markdown' });
        } catch (err) {
          console.error(`Failed to send reminder to user ${user.telegram_id}`, err);
        }
      }
    }

    lastReminderDateStr = todayStr;
    console.log(`[Reminders] Sent evening reminders for ${todayStr}.`);
  } catch (error) {
    console.error('[Reminders] Error checking reminders:', error);
  }
}
