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
import { handleActivity, handleActivityText, handleActivityCallback } from './handlers/activityHandler';
import { handleHistory } from './handlers/historyHandler';
import { handleAsk } from './handlers/askHandler';
import { handleQuickAdd, handleQuickAddCallback } from './handlers/quickAddHandler';
import { handleRecipe } from './handlers/recipeHandler';
import { handlePhotoCookingCallback, handlePhotoSeasoningCallback } from './handlers/photoQAHandler';
import { handleTarget } from './handlers/targetHandler';
import { handleTrend } from './handlers/trendHandler';
import { handleScan, handleScanPhoto, handleScanCallback, scanPendingUsers } from './handlers/scanHandler';

export function setupBot(token: string): Bot {
  const bot = new Bot(token);

  // ── Commands ──────────────────────────────────────────────
  bot.command('start',    handleStart);
  bot.command('weekly',   handleWeekly);
  bot.command('streak',   handleStreak);
  bot.command('water',    handleWater);
  bot.command('weight',   handleWeight);
  bot.command('groceries',handleGroceries);
  bot.command('plan',     handlePlan);
  bot.command('export',   handleExport);
  bot.command('activity', handleActivity);
  bot.command('history',  handleHistory);
  bot.command('ask',      handleAsk);
  bot.command('quickadd', handleQuickAdd);
  bot.command('recipe',   handleRecipe);
  bot.command('target',   handleTarget);
  bot.command('trend',    handleTrend);
  bot.command('scan',     async (ctx) => {
    scanPendingUsers.add(ctx.from!.id);
    await handleScan(ctx);
  });

  // ── Inline Callbacks ──────────────────────────────────────
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Photo Q&A: cooking method
    if (data.startsWith('photo_cook_')) {
      await handlePhotoCookingCallback(ctx);
      return;
    }
    // Photo Q&A: seasoning
    if (data.startsWith('photo_season_')) {
      await handlePhotoSeasoningCallback(ctx);
      return;
    }
    // Scan callback
    if (data.startsWith('scan_')) {
      await handleScanCallback(ctx);
      return;
    }
    // Activity multi-step callbacks
    if (data.startsWith('act_')) {
      await handleActivityCallback(ctx);
      return;
    }
    // Quick Add food tap
    if (data.startsWith('quickadd_')) {
      await handleQuickAddCallback(ctx);
      return;
    }
    // Hydration quick-add
    if (data.startsWith('water_add_')) {
      await handleWaterCallback(ctx);
      return;
    }
    // Meal confirm / discard / skip-clarify
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

  // ── Message Handlers ──────────────────────────────────────
  bot.on('message:photo', async (ctx) => {
    const scanned = await handleScanPhoto(ctx);
    if (!scanned) await handlePhoto(ctx);
  });
  bot.on('message:text', async (ctx) => {
    // Activity multi-step text responses take priority
    const handled = await handleActivityText(ctx);
    if (!handled) await handleText(ctx);
  });

  // ── Error Handler ─────────────────────────────────────────
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error handling update ${ctx.update.update_id}:`, err.error);
  });

  return bot;
}
