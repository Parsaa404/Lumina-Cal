/**
 * Smart Daily Score (0-10)
 * Rates the day based on: calories, protein, sugar, fiber, timing
 */

import { DailySummary, User } from '../../shared/types';

export interface DailyScore {
  overall: number;          // 0-10 final score
  breakdown: {
    calories: number;       // 0-2 points
    protein: number;        // 0-2 points
    sugar: number;          // 0-2 points
    fiber: number;          // 0-2 points
    consistency: number;    // 0-2 points (logged meals > 2)
  };
  grade: string;            // A / B / C / D / F
  message: string;
}

export function calculateDailyScore(summary: DailySummary, user: User): DailyScore {
  const calGoal = user.dailyCalorieGoal || 2000;
  const proteinGoal = user.dailyProteinGoal || 150;

  // ── Calories (0-2 pts): ideal = ±10% of target ──
  const calRatio = summary.totalCalories / calGoal;
  let calScore = 2;
  if (calRatio > 1.15) calScore = Math.max(0, 2 - (calRatio - 1.15) * 5);
  else if (calRatio < 0.7) calScore = Math.max(0, calRatio / 0.7 * 2);
  calScore = Math.round(calScore * 10) / 10;

  // ── Protein (0-2 pts): ≥80% of target is full score ──
  const proteinRatio = summary.totalProtein / proteinGoal;
  let proteinScore = Math.min(2, proteinRatio * 2.5);
  proteinScore = Math.round(proteinScore * 10) / 10;

  // ── Sugar (0-2 pts): <25g perfect, <35g good, >50g poor ──
  const sugarG = summary.totalSugar || 0;
  let sugarScore = 2;
  if (sugarG > 50) sugarScore = 0;
  else if (sugarG > 35) sugarScore = 1;
  else if (sugarG > 25) sugarScore = 1.5;
  sugarScore = Math.round(sugarScore * 10) / 10;

  // ── Fiber (0-2 pts): target 25-30g ──
  const fiberG = summary.meals.reduce((s, m) => s + (m.nutrition.fiber || 0), 0);
  let fiberScore = Math.min(2, (fiberG / 25) * 2);
  fiberScore = Math.round(fiberScore * 10) / 10;

  // ── Consistency (0-2 pts): logging ≥3 meals ──
  const mealCount = summary.meals.length;
  let consistencyScore = Math.min(2, mealCount * 0.67);
  consistencyScore = Math.round(consistencyScore * 10) / 10;

  const overall = Math.round((calScore + proteinScore + sugarScore + fiberScore + consistencyScore) * 10) / 10;

  let grade: string;
  let message: string;
  if (overall >= 9) { grade = 'A+'; message = 'Perfect day! Your nutrition was on point.'; }
  else if (overall >= 8) { grade = 'A';  message = 'Excellent nutrition day! Keep it up.'; }
  else if (overall >= 7) { grade = 'B';  message = 'Good day. Small tweaks will get you to A.'; }
  else if (overall >= 6) { grade = 'C+'; message = 'Decent. Focus on protein and fiber tomorrow.'; }
  else if (overall >= 5) { grade = 'C';  message = 'Average day. Try to hit your protein target.'; }
  else if (overall >= 4) { grade = 'D';  message = 'Below average. Log every meal to improve.'; }
  else               { grade = 'F';  message = 'Tough day. Tomorrow is a fresh start!'; }

  return {
    overall,
    breakdown: { calories: calScore, protein: proteinScore, sugar: sugarScore, fiber: fiberScore, consistency: consistencyScore },
    grade,
    message,
  };
}

export function formatDailyScore(score: DailyScore): string {
  const b = score.breakdown;
  const stars = '⭐'.repeat(Math.round(score.overall / 2));

  let msg = `\n📊 *Daily Nutrition Score: ${score.overall}/10 (${score.grade})*\n`;
  msg += `${stars}\n`;
  msg += `_${score.message}_\n\n`;
  msg += `Breakdown:\n`;
  msg += `  Calories    ${bar(b.calories, 2)} ${b.calories}/2\n`;
  msg += `  Protein     ${bar(b.protein, 2)} ${b.protein}/2\n`;
  msg += `  Sugar       ${bar(b.sugar, 2)} ${b.sugar}/2\n`;
  msg += `  Fiber       ${bar(b.fiber, 2)} ${b.fiber}/2\n`;
  msg += `  Consistency ${bar(b.consistency, 2)} ${b.consistency}/2`;
  return msg;
}

function bar(value: number, max: number): string {
  const filled = Math.round((value / max) * 5);
  return '█'.repeat(filled) + '░'.repeat(5 - filled);
}
