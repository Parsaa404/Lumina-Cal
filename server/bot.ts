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
import { handleFast } from './handlers/fastHandler';
import { handleProgress, handleProgressPhoto } from './handlers/progressHandler';
import { handleCoach } from './handlers/coachHandler';
import { handleRepeat, handleRepeatCallback } from './handlers/repeatHandler';
import { handlePredict } from './handlers/predictHandler';
import { handleReport } from './handlers/reportHandler';
import { handleBadges } from './handlers/badgesHandler';
import { handleCommands } from './handlers/commandsHandler';

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
  bot.command('fast',     handleFast);
  bot.command('progress', handleProgress);
  bot.command('coach',    handleCoach);
  bot.command('repeat',   handleRepeat);
  bot.command('predict',  handlePredict);
  bot.command('report',   handleReport);
  bot.command('badges',   handleBadges);
  bot.command('commands', handleCommands);

  // Set Telegram autocomplete menu
  bot.api.setMyCommands([
    { command: 'start', description: 'Start & Settings' },
    { command: 'water', description: 'Log Water' },
    { command: 'weight', description: 'Log Weight & ETA' },
    { command: 'activity', description: 'Log Exercise' },
    { command: 'scan', description: 'Barcode Scanner' },
    { command: 'fast', description: 'Fasting Tracker' },
    { command: 'coach', description: 'AI Weekly Coach' },
    { command: 'repeat', description: 'Repeat a past meal' },
    { command: 'quickadd', description: 'Quick-add top foods' },
    { command: 'progress', description: 'Body photo gallery' },
    { command: 'trend', description: 'Weight trend chart' },
    { command: 'badges', description: 'Your achievements' },
    { command: 'report', description: 'Monthly report' },
    { command: 'commands', description: 'List ALL commands' },
  ]).catch(console.error);

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
    // Repeat meal callback
    if (data.startsWith('repeat_log_')) {
      await handleRepeatCallback(ctx);
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
    // Priority order: progress photo → barcode scan → food analysis
    const isProgress = await handleProgressPhoto(ctx);
    if (isProgress) return;
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
