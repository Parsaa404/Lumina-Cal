/**
 * Nutrition Engine — pure calculation functions, framework-agnostic.
 * Can be used by Telegram bot, mobile app, or any web frontend.
 * No Telegram, no Supabase — pure math only.
 */

export interface UserProfile {
  gender: 'male' | 'female';
  height: number;   // cm
  weight: number;   // kg
  age: number;
  activityLevel?: ActivityLevel;
}

export type ActivityLevel =
  | 'sedentary'    // desk job, no exercise
  | 'light'        // 1-3 days/week exercise
  | 'moderate'     // 3-5 days/week exercise
  | 'active'       // 6-7 days/week hard exercise
  | 'athlete';     // 2x/day or physical job

// Activity multipliers (PAL)
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
  athlete:   1.9,
};

export interface MacroTargets {
  calories: number;
  protein: number;  // g
  carbs: number;    // g
  fats: number;     // g
}

export function calculateBMI(height: number, weight: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}

export function calculateBodyFat(bmi: number, age: number, gender: 'male' | 'female'): number {
  const genderFactor = gender === 'male' ? 16.8 : 0;
  return Math.round(((1.20 * bmi) + (0.23 * age) - genderFactor - 5.4) * 10) / 10;
}

export function getBodyFatCategory(pbf: number, gender: 'male' | 'female'): string {
  if (gender === 'male') {
    if (pbf < 6)  return 'Essential Fat';
    if (pbf < 14) return 'Athlete';
    if (pbf < 18) return 'Fitness';
    if (pbf < 25) return 'Average';
    return 'Obese';
  } else {
    if (pbf < 14) return 'Essential Fat';
    if (pbf < 21) return 'Athlete';
    if (pbf < 25) return 'Fitness';
    if (pbf < 32) return 'Average';
    return 'Obese';
  }
}

export function calculateBMR(profile: UserProfile): number {
  const { gender, height, weight, age } = profile;
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel || 'moderate'];
  return Math.round(bmr * multiplier);
}

export function calculateDailyMacros(profile: UserProfile, goal: string): MacroTargets {
  const tdee = calculateTDEE(profile);
  let calories: number;
  let proteinPerKg: number;

  switch (goal) {
    case 'weight_loss':      calories = Math.round(tdee * 0.78); proteinPerKg = 2.2; break;
    case 'muscle_building':  calories = Math.round(tdee * 1.12); proteinPerKg = 2.0; break;
    case 'maintain':         calories = tdee;                     proteinPerKg = 1.8; break;
    case 'recomposition':    calories = Math.round(tdee * 0.92); proteinPerKg = 2.4; break;
    default:                 calories = Math.round(tdee * 0.94); proteinPerKg = 1.6; break;
  }

  const protein = Math.round(profile.weight * proteinPerKg);
  const fats    = Math.round(profile.weight * 0.8);
  const carbs   = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4));
  return { calories, protein, carbs, fats };
}

export function calculateLBM(weight: number, bodyFatPct: number): number {
  return Math.round((weight * (1 - bodyFatPct / 100)) * 10) / 10;
}

export function predictWeight30Days(currentWeight: number, weeklyChanges: number[]): number | null {
  if (weeklyChanges.length < 2) return null;
  const avg = weeklyChanges.reduce((a, b) => a + b, 0) / weeklyChanges.length;
  return Math.round((currentWeight + avg * 4.3) * 10) / 10;
}
