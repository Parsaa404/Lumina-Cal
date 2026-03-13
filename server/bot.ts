import { Bot } from 'grammy';
import { handleStart } from './handlers/startHandler';
import { handlePhoto } from './handlers/photoHandler';
import { handleText } from './handlers/textHandler';
import { handleOnboardingCallback } from './handlers/onboardingHandler';
import { handleWeekly, handleStreak } from './handlers/weeklyHandler';
import { handleMealConfirmCallback } from './handlers/mealConfirmHandler';

export function setupBot(token: string): Bot {
  const bot = new Bot(token);

  // Commands
  bot.command('start', handleStart);
  bot.command('weekly', handleWeekly);
  bot.command('streak', handleStreak);

  // Inline button callbacks
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Meal flow: clarification skip, confirm, discard
    if (
      data.startsWith('skip_clarify_') ||
      data.startsWith('confirm_meal_') ||
      data.startsWith('discard_meal_')
    ) {
      await handleMealConfirmCallback(ctx);
      return;
    }

    // Onboarding buttons
    await handleOnboardingCallback(ctx);
  });

  // Message handlers
  bot.on('message:photo', handlePhoto);
  bot.on('message:text', handleText);

  // Error handling
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });

  return bot;
}
