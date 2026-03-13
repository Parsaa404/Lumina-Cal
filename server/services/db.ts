import { createClient } from '@supabase/supabase-js';
import { User, MealLog, DailySummary, Goal } from '../../shared/types';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const db = {
  async getUser(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegramId', telegramId)
      .single();
    if (error) return null;
    return data as User;
  },

  async createUser(user: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data as User;
  },

  async updateUserGoals(telegramId: number, goals: Partial<Goal>): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update(goals)
      .eq('telegramId', telegramId);
    return !error;
  },

  async updateUserProfile(telegramId: number, profile: {
    gender?: string;
    height?: number;
    weight?: number;
    age?: number;
    bmi?: number;
    pbf?: number;
    fitnessGoal?: string;
  }): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update(profile)
      .eq('telegramId', telegramId);
    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
    return true;
  },

  /**
   * Update the user's logging streak.
   * If they logged yesterday, increment. If they already logged today, keep.
   * Otherwise, reset to 1.
   */
  async updateStreak(telegramId: number): Promise<number> {
    const user = await this.getUser(telegramId);
    if (!user) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = 1;
    if (user.lastLogDate === today) {
      // Already logged today — keep current streak
      return user.streak || 1;
    } else if (user.lastLogDate === yesterday) {
      // Logged yesterday — increment streak
      newStreak = (user.streak || 0) + 1;
    }
    // Otherwise reset to 1

    await supabase
      .from('users')
      .update({ streak: newStreak, lastLogDate: today })
      .eq('telegramId', telegramId);

    return newStreak;
  },

  async logMeal(meal: Omit<MealLog, 'id'>): Promise<MealLog | null> {
    // Store mealScore and aiFeedback as JSON-compatible fields
    const insertData = {
      ...meal,
      mealScore: meal.mealScore || null,
      nutrition: meal.nutrition,
    };

    const { data, error } = await supabase
      .from('meals')
      .insert([insertData])
      .select()
      .single();
    if (error) {
      console.error('Error logging meal:', error);
      return null;
    }
    return data as MealLog;
  },

  async getDailySummary(userId: string, date: string): Promise<DailySummary | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: meals, error } = await supabase
      .from('meals')
      .select('*')
      .eq('userId', userId)
      .gte('loggedAt', startOfDay.toISOString())
      .lte('loggedAt', endOfDay.toISOString());

    if (error || !meals) return null;

    const summary: DailySummary = {
      date,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      totalSugar: 0,
      totalSodium: 0,
      meals: meals as MealLog[],
    };

    for (const meal of summary.meals) {
      summary.totalCalories += meal.nutrition.calories;
      summary.totalProtein += meal.nutrition.protein;
      summary.totalCarbs += meal.nutrition.carbs;
      summary.totalFats += meal.nutrition.fats;
      summary.totalSugar! += meal.nutrition.sugar || 0;
      summary.totalSodium! += meal.nutrition.sodium || 0;
    }

    return summary;
  },

  /**
   * Get meals from the last 7 days for weekly report.
   */
  async getWeeklyMeals(userId: string): Promise<MealLog[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 86400000);

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('userId', userId)
      .gte('loggedAt', startDate.toISOString())
      .lte('loggedAt', endDate.toISOString())
      .order('loggedAt', { ascending: false });

    if (error || !data) return [];
    return data as MealLog[];
  },
};
