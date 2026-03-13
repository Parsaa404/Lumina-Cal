import { Context } from 'grammy';
import { db } from '../services/db';
import { generateGroceryList, generateMealPlan } from '../services/nutrition/aiRecommendations';

// ─── /groceries ──────────────────────────────────────────────

export async function handleGroceries(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply('🛒 Building your smart grocery list...');

  try {
    const meals = await db.getWeeklyMeals(user.id);
    const list = await generateGroceryList(meals, user.fitnessGoal || 'healthy_lifestyle');

    const startDate = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let msg = `🛒 *Smart Grocery List*\n`;
    msg += `_Based on your meals from ${startDate} – ${endDate}_\n\n`;
    msg += list;

    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Grocery list error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      'Failed to generate grocery list. Log some meals first!');
  }
}

// ─── /plan ───────────────────────────────────────────────────

export async function handlePlan(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply('📅 Creating your personalized weekly meal plan...');

  try {
    const plan = await generateMealPlan({
      fitnessGoal: user.fitnessGoal || 'healthy_lifestyle',
      dailyCalories: user.dailyCalorieGoal || 2000,
      dailyProtein: user.dailyProteinGoal || 150,
      dailyCarbs: user.dailyCarbsGoal || 200,
      dailyFats: user.dailyFatsGoal || 65,
      gender: user.gender || 'male',
    });

    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id, plan, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Meal plan error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      'Failed to generate meal plan. Please try again.');
  }
}
