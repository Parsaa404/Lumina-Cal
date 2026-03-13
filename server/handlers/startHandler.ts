import { Context } from 'grammy';
import { db } from '../services/db';
import { startOnboarding } from './onboardingState';
import { sendGenderPrompt } from './onboardingHandler';

export async function handleStart(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  let user = await db.getUser(telegramUser.id);

  if (!user) {
    // New user — create a basic record first
    user = await db.createUser({
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      targetWeight: 70,
      dailyCalorieGoal: 2000,
      dailyProteinGoal: 150,
      dailyCarbsGoal: 200,
      dailyFatsGoal: 65,
    });

    // Start the onboarding flow (ask for body metrics)
    startOnboarding(telegramUser.id);
    await sendGenderPrompt(ctx);
    return;
  }

  // Existing user — check if they have completed onboarding (have BMI data)
  if (!user.bmi) {
    startOnboarding(telegramUser.id);
    await sendGenderPrompt(ctx);
    return;
  }

  // Existing user with completed profile — show normal welcome
  await showWelcomeMessage(ctx, telegramUser);
}

/**
 * Shows the normal welcome message with instructions.
 * Exported so the onboarding handler can call it after completion.
 */
export async function showWelcomeMessage(ctx: Context, telegramUser: { first_name: string }) {
  const appUrl = process.env.APP_URL || '';

  const messageText =
    `Welcome back, ${telegramUser.first_name}! 🍏\n\n` +
    `I can help you track your meals and hit your nutrition goals.\n\n` +
    `How to use me:\n` +
    `📸 Send a photo of your meal\n` +
    `🏷️ Send a photo of a barcode\n` +
    `✍️ Type what you ate (e.g., "2 eggs and toast")\n\n` +
    `Tap the button below to open your dashboard and set your goals.`;

  try {
    if (appUrl && appUrl.startsWith('https://') && !appUrl.includes('t.me/')) {
      await ctx.reply(messageText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open Dashboard 📊', web_app: { url: appUrl } }]
          ]
        }
      });
    } else if (appUrl) {
      await ctx.reply(messageText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open Dashboard 📊', url: appUrl }]
          ]
        }
      });
    } else {
      await ctx.reply(messageText);
    }
  } catch (error) {
    console.error('Error in welcome message:', error);
    await ctx.reply(messageText);
  }
}
