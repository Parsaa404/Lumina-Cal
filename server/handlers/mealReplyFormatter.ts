import { VisionAnalysisResult } from '../services/nutrition/visionFallback';
import { User, DailySummary } from '../../shared/types';

// ─── Preview (before user confirms) ──────────────────────────

export function formatMealPreview(analysis: VisionAnalysisResult): string {
  const { calories, protein, carbs, fats, sugar, sodium } = analysis.nutrition;
  const score = analysis.mealScore;

  let msg = `🍽️ *Meal Analysis*\n\n`;
  msg += `*${analysis.description}*\n`;
  if (analysis.cuisineType) msg += `Cuisine: ${analysis.cuisineType}\n`;

  // Plate segmentation
  if (analysis.items && analysis.items.length > 0) {
    msg += `\n*Items Detected:*\n`;
    for (const item of analysis.items) {
      msg += `  • ${item.name} (${item.portion}) — ${item.calories} kcal\n`;
    }
  }

  // Nutrition — clean, no emojis, aligned
  msg += `\n*Nutrition Breakdown:*\n`;
  msg += formatNutritionTable(calories, protein, carbs, fats, sugar, sodium);

  // Meal Score
  if (score) {
    msg += `\n*Meal Score: ${score.overall} / 10*\n`;
    if (score.pros.length > 0) msg += `✅ ${score.pros.join(' · ')}\n`;
    if (score.cons.length > 0) msg += `⚠️ ${score.cons.join(' · ')}\n`;
  }

  // AI Feedback
  if (analysis.aiFeedback) {
    msg += `\n💡 _${analysis.aiFeedback}_\n`;
  }

  if (analysis.confidenceScore < 60) {
    msg += `\n_⚠️ Low confidence (${analysis.confidenceScore}%) — consider adding corrections_\n`;
  }

  msg += `\n👇 *Log this meal or discard it*`;
  return msg;
}

// ─── Confirmed (after user clicks Log Meal) ───────────────────

export function formatMealConfirmed(
  analysis: VisionAnalysisResult,
  user: User,
  summary: DailySummary | null,
  streak: number
): string {
  const { calories, protein, carbs, fats } = analysis.nutrition;

  let msg = `✅ *Meal Logged!*\n\n`;
  msg += `*${analysis.description}*\n`;
  msg += formatNutritionTable(calories, protein, carbs, fats);

  if (analysis.mealScore) {
    msg += `\nMeal Score: *${analysis.mealScore.overall} / 10*\n`;
  }

  // Daily Progress
  if (summary && user.dailyCalorieGoal) {
    const totalCal = summary.totalCalories;
    const calGoal = user.dailyCalorieGoal;
    const remaining = calGoal - totalCal;
    const percent = Math.round((totalCal / calGoal) * 100);

    msg += `\n*Daily Progress:* ${Math.round(totalCal)} / ${calGoal} kcal (${percent}%)\n`;

    if (totalCal > calGoal) {
      const overBy = Math.round(totalCal - calGoal);
      msg += `\n🔴 *Over limit by ${overBy} kcal*\n`;
      msg += `• Drink plenty of water\n`;
      msg += `• Go for a 20-30 min walk\n`;
      msg += `• Skip snacking for the rest of the day\n`;
    } else if (remaining > 0 && remaining < 300) {
      msg += `⚠️ Only ${Math.round(remaining)} kcal remaining — choose wisely!\n`;
    }

    if (summary.totalSugar && summary.totalSugar > 35) {
      msg += `\n⚠️ *High Sugar Today:* ${Math.round(summary.totalSugar)}g (max 35g)\n`;
      msg += `• Replace soda with sparkling water\n`;
      msg += `• Choose dark chocolate over sweet snacks\n`;
    }

    if (user.dailyProteinGoal) {
      const proteinPct = summary.totalProtein / user.dailyProteinGoal;
      const calPct = totalCal / calGoal;
      if (proteinPct < 0.5 && calPct > 0.6) {
        msg += `\n⚠️ *Low Protein:* ${Math.round(summary.totalProtein)}g / ${user.dailyProteinGoal}g\n`;
        msg += `• Add eggs, Greek yogurt, or chicken breast\n`;
      }
    }
  }

  const badge = getStreakBadge(streak);
  if (badge) msg += `\n${badge}`;

  return msg;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Formats macro values as a clean table — no emojis, aligned labels and values.
 */
function formatNutritionTable(
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  sugar?: number,
  sodium?: number
): string {
  const rows: [string, string][] = [
    ['Calories', `${Math.round(calories)} kcal`],
    ['Protein',  `${Math.round(protein)} g`],
    ['Carbs',    `${Math.round(carbs)} g`],
    ['Fats',     `${Math.round(fats)} g`],
  ];
  if (sugar !== undefined && sugar > 0) rows.push(['Sugar', `${Math.round(sugar)} g`]);
  if (sodium !== undefined && sodium > 0) rows.push(['Sodium', `${Math.round(sodium)} mg`]);

  const maxLabel = Math.max(...rows.map(([l]) => l.length));
  return rows.map(([label, value]) => `  ${label.padEnd(maxLabel)}  ${value}`).join('\n') + '\n';
}

export function getStreakBadge(streak: number): string {
  if (streak <= 0) return '';

  let msg = `🔥 *${streak} Day Streak*`;
  const badges = [
    { days: 3,   emoji: '🏅', name: '3-Day Warrior' },
    { days: 7,   emoji: '🏆', name: 'Week Champion' },
    { days: 14,  emoji: '💎', name: '2-Week Legend' },
    { days: 30,  emoji: '👑', name: 'Monthly Master' },
    { days: 60,  emoji: '🦾', name: 'Iron Will' },
    { days: 100, emoji: '🌟', name: 'Centurion' },
  ];
  const earned = badges.filter(b => streak >= b.days);
  if (earned.length > 0) {
    const top = earned[earned.length - 1];
    msg += `  ${top.emoji} ${top.name}`;
  }
  return msg;
}
