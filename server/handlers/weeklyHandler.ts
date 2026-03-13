import { Context } from 'grammy';
import { db } from '../services/db';
import { generateWeeklyInsight } from '../services/nutrition/aiRecommendations';
import { MealLog } from '../../shared/types';

export async function handleWeekly(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) {
    await ctx.reply('Please use /start first to register.');
    return;
  }

  const loadingMsg = await ctx.reply('📊 Generating your weekly report...');

  try {
    const meals = await db.getWeeklyMeals(user.id);

    if (meals.length === 0) {
      await ctx.api.editMessageText(
        ctx.chat?.id as number,
        loadingMsg.message_id,
        'No meals logged this week. Start logging to get weekly insights! 📝'
      );
      return;
    }

    // Calculate weekly aggregates
    const daysMap = new Map<string, MealLog[]>();
    for (const meal of meals) {
      const day = meal.loggedAt.split('T')[0];
      if (!daysMap.has(day)) daysMap.set(day, []);
      daysMap.get(day)!.push(meal);
    }

    const totalCalories = meals.reduce((s, m) => s + m.nutrition.calories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.nutrition.protein, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.nutrition.carbs, 0);
    const totalFats = meals.reduce((s, m) => s + m.nutrition.fats, 0);
    const daysLogged = daysMap.size;

    const avgCalories = Math.round(totalCalories / daysLogged);
    const avgProtein = Math.round(totalProtein / daysLogged);
    const avgCarbs = Math.round(totalCarbs / daysLogged);
    const avgFats = Math.round(totalFats / daysLogged);

    // Average meal score
    const scoredMeals = meals.filter(m => m.mealScore?.overall);
    const avgMealScore = scoredMeals.length > 0
      ? parseFloat((scoredMeals.reduce((s, m) => s + (m.mealScore?.overall || 0), 0) / scoredMeals.length).toFixed(1))
      : 0;

    // Get AI weekly insight
    let insight = '';
    try {
      insight = await generateWeeklyInsight({
        gender: user.gender || 'male',
        weight: user.weight || 70,
        fitnessGoal: user.fitnessGoal || 'general_fitness',
        weekStats: { avgCalories, avgProtein, avgCarbs, avgFats, totalMeals: meals.length, daysLogged, avgMealScore },
        currentGoals: {
          dailyCalories: user.dailyCalorieGoal || 2000,
          dailyProtein: user.dailyProteinGoal || 150,
          dailyCarbs: user.dailyCarbsGoal || 200,
          dailyFats: user.dailyFatsGoal || 65,
        },
      });
    } catch {
      insight = 'Keep up the consistent logging!';
    }

    // Build report
    const startDate = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let msg = `📊 *Weekly Report*\n`;
    msg += `📅 ${startDate} — ${endDate}\n\n`;
    msg += `┌─────────────────────\n`;
    msg += `│ 🔥 Avg Calories: *${avgCalories}* kcal\n`;
    msg += `│ 🥩 Avg Protein: *${avgProtein}*g\n`;
    msg += `│ 🍞 Avg Carbs: *${avgCarbs}*g\n`;
    msg += `│ 🥑 Avg Fats: *${avgFats}*g\n`;
    msg += `├─────────────────────\n`;
    msg += `│ 📝 Meals logged: *${meals.length}*\n`;
    msg += `│ 📆 Days tracked: *${daysLogged}* / 7\n`;
    if (avgMealScore > 0) {
      msg += `│ ⭐ Avg Meal Score: *${avgMealScore}* / 10\n`;
    }
    if (user.streak) {
      msg += `│ 🔥 Current Streak: *${user.streak}* days\n`;
    }
    msg += `└─────────────────────\n`;
    msg += `\n🧠 *AI Insight:*\n_${insight}_`;

    await ctx.api.editMessageText(
      ctx.chat?.id as number,
      loadingMsg.message_id,
      msg,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Weekly report error:', error);
    await ctx.api.editMessageText(
      ctx.chat?.id as number,
      loadingMsg.message_id,
      'An error occurred generating your weekly report. Please try again.'
    );
  }
}

export async function handleStreak(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) {
    await ctx.reply('Please use /start first to register.');
    return;
  }

  const streak = user.streak || 0;

  let msg = `🔥 *Your Streak*\n\n`;
  
  if (streak === 0) {
    msg += `You haven't started a streak yet!\nLog a meal today to begin. 💪`;
  } else {
    msg += `*${streak} day${streak > 1 ? 's' : ''}* of consecutive logging!\n\n`;
    msg += `🏆 *Achievements:*\n`;
    
    const achievements = [
      { days: 3, name: 'Getting Started', emoji: '🏅', unlocked: streak >= 3 },
      { days: 7, name: 'Week Warrior', emoji: '🏆', unlocked: streak >= 7 },
      { days: 14, name: 'Two-Week Legend', emoji: '💎', unlocked: streak >= 14 },
      { days: 30, name: 'Monthly Master', emoji: '👑', unlocked: streak >= 30 },
      { days: 60, name: 'Iron Will', emoji: '🦾', unlocked: streak >= 60 },
      { days: 100, name: 'Centurion', emoji: '🌟', unlocked: streak >= 100 },
    ];

    for (const a of achievements) {
      msg += `${a.unlocked ? a.emoji : '🔒'} ${a.name} (${a.days} days) ${a.unlocked ? '✅' : ''}\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
