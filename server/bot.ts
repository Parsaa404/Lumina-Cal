import { Bot } from 'grammy';
import { handleStart } from './handlers/startHandler';
import { handlePhoto } from './handlers/photoHandler';
import { handleText } from './handlers/textHandler';
import { handleOnboardingCallback } from './handlers/onboardingHandler';
import { handleWeekly, handleStreak } from './handlers/weeklyHandler';
import { handleMealConfirmCallback } from './handlers/mealConfirmHandler';
import { handleWater, handleWaterCallback } from './handlers/hydrationHandler';
import { handleWeight } from './handlers/weightHandler';
import { handleGroceries, handlePlan } from './handlers/planningHandler';
import { handleExport } from './handlers/exportHandler';
import { handleActivity } from './handlers/activityHandler';
import { handleHistory } from './handlers/historyHandler';
import { handleAsk } from './handlers/askHandler';

export function setupBot(token: string): Bot {
  const bot = new Bot(token);

  // ── Commands ──────────────────────────────────────────────
  bot.command('start',     handleStart);
  bot.command('weekly',    handleWeekly);
  bot.command('streak',    handleStreak);
  bot.command('water',     handleWater);
  bot.command('weight',    handleWeight);
  bot.command('groceries', handleGroceries);
  bot.command('plan',      handlePlan);
  bot.command('export',    handleExport);
  bot.command('activity',  handleActivity);
  bot.command('history',   handleHistory);
  bot.command('ask',       handleAsk);

  // ── Inline Callbacks ──────────────────────────────────────
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('water_add_')) {
      await handleWaterCallback(ctx);
      return;
    }

    if (
      data.startsWith('skip_clarify_') ||
      data.startsWith('confirm_meal_') ||
      data.startsWith('discard_meal_')
    ) {
      await handleMealConfirmCallback(ctx);
      return;
    }

    await handleOnboardingCallback(ctx);
  });

  // ── Message Handlers ──────────────────────────────────────
  bot.on('message:photo', handlePhoto);
  bot.on('message:text',  handleText);

  // ── Error Handler ─────────────────────────────────────────
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });

  return bot;
}
