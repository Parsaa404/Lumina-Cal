/**
 * Recommendation Engine — personalized advice and detections.
 * Framework-agnostic. No Telegram dependencies.
 */

const MODEL = 'gemini-2.5-flash';

export interface MacroIssue {
  type: 'low_protein' | 'high_sugar' | 'low_fiber' | 'over_calories' | 'low_calories';
  severity: 'info' | 'warning' | 'alert';
  message: string;
  suggestion: string;
}

export function detectMacroIssues(
  eaten: { calories: number; protein: number; sugar?: number; fiber?: number },
  goals: { dailyCalories: number; dailyProtein: number }
): MacroIssue[] {
  const issues: MacroIssue[] = [];
  const calRatio     = eaten.calories / goals.dailyCalories;
  const proteinRatio = eaten.protein  / goals.dailyProtein;

  if (calRatio > 1.15) {
    issues.push({ type: 'over_calories', severity: 'alert',
      message: `Over by ${Math.round(eaten.calories - goals.dailyCalories)} kcal`,
      suggestion: 'Skip evening snacks and go for a walk.' });
  }
  if (proteinRatio < 0.5 && calRatio > 0.5) {
    issues.push({ type: 'low_protein', severity: 'warning',
      message: `Protein only ${Math.round(eaten.protein)}g / ${goals.dailyProtein}g`,
      suggestion: 'Add Greek yogurt, eggs, or a protein shake.' });
  }
  if (eaten.sugar && eaten.sugar > 50) {
    issues.push({ type: 'high_sugar', severity: 'alert',
      message: `Very high sugar: ${Math.round(eaten.sugar)}g`,
      suggestion: 'Replace juice and sweets with whole fruit or dark chocolate.' });
  } else if (eaten.sugar && eaten.sugar > 35) {
    issues.push({ type: 'high_sugar', severity: 'warning',
      message: `Sugar slightly high: ${Math.round(eaten.sugar)}g`,
      suggestion: 'Choose sparkling water over soda for the rest of the day.' });
  }
  if (eaten.fiber !== undefined && eaten.fiber < 10 && calRatio > 0.5) {
    issues.push({ type: 'low_fiber', severity: 'info',
      message: `Fiber only ${Math.round(eaten.fiber)}g (target: 25g)`,
      suggestion: 'Add broccoli, lentils, or chia seeds to your next meal.' });
  }
  return issues;
}

export function detectFastingWindow(mealTimestamps: number[]): {
  fastingHours: number; lastMealTime: Date | null; breakfastTime: Date | null;
  isIntermittentFasting: boolean; insight: string;
} {
  if (mealTimestamps.length < 2) return { fastingHours: 0, lastMealTime: null, breakfastTime: null, isIntermittentFasting: false, insight: 'Log more meals to detect your fasting pattern.' };

  const sorted   = [...mealTimestamps].sort((a, b) => a - b);
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yday     = new Date(today); yday.setDate(yday.getDate() - 1);
  const ydayStr  = yday.toISOString().split('T')[0];

  const todayMeals = sorted.map(t => new Date(t)).filter(d => d.toISOString().split('T')[0] === todayStr);
  const ydayMeals  = sorted.map(t => new Date(t)).filter(d => d.toISOString().split('T')[0] === ydayStr);

  const lastMeal  = ydayMeals.length > 0 ? ydayMeals[ydayMeals.length - 1] : null;
  const firstMeal = todayMeals.length > 0 ? todayMeals[0] : null;
  const fastingHours = lastMeal && firstMeal
    ? Math.round((firstMeal.getTime() - lastMeal.getTime()) / 3600000 * 10) / 10 : 0;

  let insight = '';
  if (fastingHours >= 16) insight = `Strong 16:8 fast (${fastingHours}h) — excellent for fat loss and insulin sensitivity.`;
  else if (fastingHours >= 12) insight = `${fastingHours}h intermittent fast — supports autophagy and fat burning.`;
  else if (fastingHours > 0) insight = `${fastingHours}h fasting window. Extending to 14-16h can improve fat loss.`;

  const dinnerHours = sorted.map(t => new Date(t).getHours()).filter(h => h >= 18);
  if (dinnerHours.length > 0) {
    const avg = dinnerHours.reduce((a, b) => a + b, 0) / dinnerHours.length;
    if (avg > 21) insight += ` Late dinners (~${Math.round(avg)}:00) may slow fat loss. Try eating by 9:30 PM.`;
  }

  return { fastingHours, lastMealTime: lastMeal, breakfastTime: firstMeal, isIntermittentFasting: fastingHours >= 12, insight };
}

export async function generateFoodSubstitution(foodName: string, goal: string): Promise<string> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = `Nutritionist giving healthier alternatives to "${foodName}" for goal: ${goal}.
Show original: 🍔 *${foodName}* — ~XXX kcal | Xg P | Xg C | Xg F
Then 3-4 alternatives: • [Name] — ~XXX kcal (saves XXX kcal) — [why better]
Under 150 words, practical.`;
    const r = await ai.models.generateContent({ model: MODEL, contents: prompt });
    return r.text?.trim() || `Try grilled versions or salad-based alternatives to ${foodName}.`;
  } catch {
    return `Consider grilled chicken, Greek yogurt, or a veggie bowl as alternatives to ${foodName}.`;
  }
}

export async function generateDailyAdvice(context: {
  goal: string; eaten: { calories: number; protein: number };
  targets: { calories: number; protein: number }; timeOfDay: 'morning' | 'afternoon' | 'evening';
}): Promise<string> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const r = await ai.models.generateContent({ model: MODEL, contents: `Nutrition AI coach. Goal: ${context.goal}. Today: ${context.eaten.calories}/${context.targets.calories} kcal, protein ${context.eaten.protein}g/${context.targets.protein}g. Time: ${context.timeOfDay}. Give ONE concise actionable tip (max 2 sentences).` });
    return r.text?.trim() || '';
  } catch { return ''; }
}
