export interface User {
  id: string; // Internal UUID
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  gender?: 'male' | 'female';
  height?: number;   // cm
  weight?: number;   // kg
  age?: number;
  bmi?: number;
  pbf?: number;      // Percent Body Fat
  fitnessGoal?: string;
  activityLevel?: string; // 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  streak?: number;        // consecutive days of logging
  lastLogDate?: string;   // ISO date of last meal log
  targetWeight?: number;
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatsGoal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionBreakdown {
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fats: number; // in grams
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface MealScore {
  overall: number;      // 1-10
  pros: string[];       // positive aspects
  cons: string[];       // areas for improvement
}

export interface MealLog {
  id: string;
  userId: string;
  telegramMessageId?: number;
  description: string;
  photoUrl?: string;
  nutrition: NutritionBreakdown;
  mealScore?: MealScore;
  aiFeedback?: string;     // smart AI feedback for this specific meal
  loggedAt: string;        // ISO Date String
  cuisineType?: string;
  confidenceScore?: number; // 0-100
}

export interface WaterLog {
  id: string;
  userId: string;
  amount_ml: number;
  loggedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  durationMin: number;
  caloriesBurned: number;
  loggedAt: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalSugar?: number;
  totalSodium?: number;
  waterAmount?: number;      // ml
  caloriesBurned?: number;   // kcal
  activities?: any[];        // array of tracked activities
  meals: MealLog[];
}

export interface Goal {
  targetWeight: number;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatsGoal: number;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  totalMeals: number;
  daysLogged: number;
  avgMealScore: number;
  insight: string;
}
