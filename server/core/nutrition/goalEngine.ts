/**
 * Goal Engine — adjusts macro targets based on weekly progress.
 * Framework-agnostic — no Telegram dependencies.
 */

import { calculateDailyMacros, UserProfile } from './nutritionEngine';

export interface GoalAdjustment {
  newCalories: number;
  newProtein: number;
  newCarbs: number;
  newFats: number;
  adjustment: 'deficit_increased' | 'deficit_decreased' | 'surplus_increased' | 'surplus_decreased' | 'on_track';
  message: string;
  detail: string;
}

interface ProgressData {
  goal: string;
  weeklyWeightChanges: number[];
  currentCalories: number;
  currentCarbs: number;
  profile: UserProfile;
}

const IDEAL_RATES: Record<string, { min: number; max: number }> = {
  weight_loss:      { min: -0.8, max: -0.3 },
  muscle_building:  { min: 0.1,  max: 0.3  },
  maintain:         { min: -0.2, max: 0.2  },
  recomposition:    { min: -0.3, max: 0.1  },
  healthy_lifestyle:{ min: -0.3, max: 0.1  },
};

export function adjustCaloriesByProgress(data: ProgressData): GoalAdjustment {
  const { goal, weeklyWeightChanges, currentCalories, currentCarbs, profile } = data;
  const base  = calculateDailyMacros(profile, goal);
  const ideal = IDEAL_RATES[goal] || IDEAL_RATES.healthy_lifestyle;

  if (weeklyWeightChanges.length === 0) {
    return { newCalories: currentCalories, newProtein: base.protein, newCarbs: currentCarbs, newFats: base.fats,
      adjustment: 'on_track', message: 'Not enough data yet', detail: 'Log your weight weekly for adaptive recommendations.' };
  }

  const recent = weeklyWeightChanges[weeklyWeightChanges.length - 1];

  if (goal === 'weight_loss' && recent > ideal.max) {
    const cut = Math.round(Math.min(currentCarbs * 0.15, 30));
    return { newCalories: currentCalories - cut * 4, newProtein: base.protein, newCarbs: currentCarbs - cut, newFats: base.fats,
      adjustment: 'deficit_increased', message: `Loss slower than expected (${recent > 0 ? '+' : ''}${recent}kg)`, detail: `Reduce carbs by ${cut}g/day to accelerate fat loss.` };
  }
  if (goal === 'weight_loss' && recent < ideal.min) {
    return { newCalories: currentCalories + 100, newProtein: base.protein, newCarbs: currentCarbs + 25, newFats: base.fats,
      adjustment: 'deficit_decreased', message: `Losing too fast (${recent}kg/week)`, detail: 'Add 25g carbs/day to protect muscle mass.' };
  }
  if (goal === 'muscle_building' && recent < ideal.min) {
    return { newCalories: currentCalories + 100, newProtein: base.protein, newCarbs: currentCarbs + 25, newFats: base.fats,
      adjustment: 'surplus_increased', message: `Gaining too slowly (${recent}kg/week)`, detail: 'Add 100 kcal/day. Focus on post-workout carbs.' };
  }
  if (goal === 'muscle_building' && recent > ideal.max) {
    return { newCalories: currentCalories - 100, newProtein: base.protein, newCarbs: currentCarbs - 25, newFats: base.fats,
      adjustment: 'surplus_decreased', message: `Gaining too fast (${recent}kg/week)`, detail: 'Reduce 100 kcal/day to minimize fat gain.' };
  }

  return { newCalories: currentCalories, newProtein: base.protein, newCarbs: currentCarbs, newFats: base.fats,
    adjustment: 'on_track', message: `Perfect pace (${recent > 0 ? '+' : ''}${recent}kg/week) ✅`, detail: 'Stay the course — your metabolism is responding well.' };
}

export function getActivityLevelMultiplier(level: string): number {
  const map: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
  return map[level] || 1.55;
}
