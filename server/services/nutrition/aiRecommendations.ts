import { GoogleGenAI, Type } from '@google/genai';
import { getGenAI } from './visionFallback';

export interface NutritionPlan {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  tip: string;
}

interface UserProfile {
  gender: 'male' | 'female';
  height: number;   // cm
  weight: number;   // kg
  age: number;
  bmi: number;
  pbf: number;
  fitnessGoal: string;
}

/**
 * Uses Gemini AI to generate a personalized daily nutrition plan
 * based on the user's body profile and fitness goal.
 */
export async function generateNutritionPlan(profile: UserProfile): Promise<NutritionPlan | null> {
  try {
    const genAI = getGenAI();

    const goalLabels: Record<string, string> = {
      muscle_building: 'Building muscle and gaining lean mass (caloric surplus with high protein)',
      weight_loss: 'Losing fat while preserving muscle mass (caloric deficit, high protein)',
      maintain: 'Maintaining current weight and body composition',
      recomposition: 'Losing fat and gaining muscle simultaneously (slight deficit, very high protein)',
      healthy_lifestyle: 'Improving overall health, energy, and longevity (balanced macros, nutrient-dense)',
    };

    const goalDescription = goalLabels[profile.fitnessGoal] || profile.fitnessGoal;

    const prompt = `
You are an expert sports nutritionist. Generate precise daily nutrition targets for this user.

Profile:
- Gender: ${profile.gender}
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Age: ${profile.age} years
- BMI: ${profile.bmi}
- Body Fat: ${profile.pbf}%
- Fitness Goal: ${goalDescription}

Instructions:
1. Calculate BMR using Mifflin-St Jeor equation
2. Apply moderate activity multiplier (1.55)
3. Adjust calories precisely for the fitness goal:
   - Fat Loss: 20-25% deficit (higher deficit if body fat % is high)
   - Muscle Gain: 10-15% surplus
   - Maintain: maintenance calories
   - Recomposition: 5-10% deficit with very high protein (2.2-2.5g/kg)
   - Healthy Lifestyle: slight deficit 5-10%, balanced macros
4. Set protein HIGH for fat loss and recomp (2.0-2.5g/kg)
5. Provide a motivating, specific nutrition tip (1-2 sentences)
6. Round all numbers to whole values
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dailyCalories: { type: Type.NUMBER, description: 'Recommended daily calories (kcal)' },
            dailyProtein: { type: Type.NUMBER, description: 'Recommended daily protein (grams)' },
            dailyCarbs: { type: Type.NUMBER, description: 'Recommended daily carbs (grams)' },
            dailyFats: { type: Type.NUMBER, description: 'Recommended daily fats (grams)' },
            tip: { type: Type.STRING, description: 'A motivating, specific nutrition tip' },
          },
          required: ['dailyCalories', 'dailyProtein', 'dailyCarbs', 'dailyFats', 'tip']
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;

    const plan = JSON.parse(jsonStr) as NutritionPlan;
    plan.dailyCalories = Math.round(plan.dailyCalories);
    plan.dailyProtein = Math.round(plan.dailyProtein);
    plan.dailyCarbs = Math.round(plan.dailyCarbs);
    plan.dailyFats = Math.round(plan.dailyFats);

    return plan;
  } catch (error) {
    console.error('Error generating nutrition plan:', error);
    return null;
  }
}

/**
 * Fallback nutrition plan when AI is unavailable.
 */
export function getFallbackNutritionPlan(profile: UserProfile): NutritionPlan {
  let bmr: number;
  if (profile.gender === 'male') {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }

  let tdee = bmr * 1.55;
  let dailyCalories: number;
  let proteinMultiplier: number;

  switch (profile.fitnessGoal) {
    case 'weight_loss':
      dailyCalories = tdee * 0.78;
      proteinMultiplier = 2.2;
      break;
    case 'muscle_building':
      dailyCalories = tdee * 1.12;
      proteinMultiplier = 2.0;
      break;
    case 'maintain':
      dailyCalories = tdee;
      proteinMultiplier = 1.8;
      break;
    case 'recomposition':
      dailyCalories = tdee * 0.92;
      proteinMultiplier = 2.4;
      break;
    default: // healthy_lifestyle
      dailyCalories = tdee * 0.93;
      proteinMultiplier = 1.6;
      break;
  }

  const dailyProtein = Math.round(profile.weight * proteinMultiplier);
  const proteinCals = dailyProtein * 4;
  const dailyFats = Math.round((dailyCalories * 0.25) / 9);
  const fatCals = dailyFats * 9;
  const dailyCarbs = Math.round((dailyCalories - proteinCals - fatCals) / 4);

  const tips: Record<string, string> = {
    weight_loss: 'Focus on high-protein meals to preserve muscle while cutting. Eat plenty of vegetables for volume and fiber.',
    muscle_building: 'Spread protein across 4-5 meals for optimal synthesis. Never skip post-workout nutrition.',
    maintain: 'Consistency is key. Keep balanced macros and listen to your hunger signals.',
    recomposition: 'Prioritize protein above all else. Time carbs around workouts for best results.',
    healthy_lifestyle: 'Eat the rainbow — variety in fruits and vegetables ensures maximum micronutrient intake.',
  };

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein,
    dailyCarbs,
    dailyFats,
    tip: tips[profile.fitnessGoal] || tips.healthy_lifestyle,
  };
}

/**
 * Generate AI-powered weekly adaptive recommendation.
 */
export async function generateWeeklyInsight(profile: {
  gender: string;
  weight: number;
  fitnessGoal: string;
  weekStats: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFats: number;
    totalMeals: number;
    daysLogged: number;
    avgMealScore: number;
  };
  currentGoals: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFats: number;
  };
}): Promise<string> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a sports nutritionist reviewing a client's weekly nutrition data.

Profile: ${profile.gender}, ${profile.weight}kg, Goal: ${profile.fitnessGoal}

This week's averages:
- Calories: ${profile.weekStats.avgCalories} / ${profile.currentGoals.dailyCalories} target
- Protein: ${profile.weekStats.avgProtein}g / ${profile.currentGoals.dailyProtein}g target
- Carbs: ${profile.weekStats.avgCarbs}g / ${profile.currentGoals.dailyCarbs}g target
- Fats: ${profile.weekStats.avgFats}g / ${profile.currentGoals.dailyFats}g target
- Meals logged: ${profile.weekStats.totalMeals} across ${profile.weekStats.daysLogged} days
- Average meal quality score: ${profile.weekStats.avgMealScore}/10

Write a brief weekly insight (3-4 sentences). Include:
1. What they did well
2. What to improve
3. One specific actionable suggestion for next week
Be encouraging but honest.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || 'Keep logging your meals consistently for personalized weekly insights!';
  } catch {
    return 'Keep logging your meals consistently for personalized weekly insights!';
  }
}

/**
 * Metabolic Adaptation — analyze weekly weight change and suggest calorie/macro adjustments.
 */
export async function generateMetabolicAdjustment(data: {
  fitnessGoal: string;
  currentWeight: number;
  previousWeight: number;
  weeklyChange: number;
  currentCalories: number;
  currentCarbs: number;
}): Promise<string> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a metabolic adaptation expert and AI coach.

Goal: ${data.fitnessGoal}
Previous weight: ${data.previousWeight}kg → Current: ${data.currentWeight}kg
Weekly change: ${data.weeklyChange > 0 ? '+' : ''}${data.weeklyChange}kg
Current calories: ${data.currentCalories} kcal/day
Current carbs: ${data.currentCarbs}g/day

Expected rates:
- Fat loss: -0.3 to -0.8kg/week is ideal
- Muscle gain: +0.1 to +0.25kg/week is ideal
- Maintain: ±0.2kg is fine
- Recomposition: slight loss or stable

Give a 2-3 sentence analysis of whether progress is on track, then ONE specific adjustment:
- If loss too slow → "Reduce carbs by Xg" or "cut 100-150 kcal"
- If loss too fast → "Add 100-150 kcal, focus on protein"
- If gain too fast → "Reduce surplus by 100 kcal"
- If on track → "Stay the course, great progress!"

Be specific with numbers. Format: analysis then adjustment on new line prefixed with 🎯.
    `;
    const response = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text?.trim() || 'Keep tracking consistently for adaptive recommendations!';
  } catch {
    return 'Keep tracking consistently for adaptive recommendations!';
  }
}

/**
 * Smart Grocery List — based on the user's recent meal patterns.
 */
export async function generateGroceryList(meals: { description: string; nutrition: any }[], fitnessGoal: string): Promise<string> {
  try {
    const genAI = getGenAI();
    const mealSummary = meals.slice(0, 20).map(m => m.description).join(', ');
    const prompt = `
You are a nutritionist creating a grocery list.

User's recent meals: ${mealSummary}
Fitness goal: ${fitnessGoal}

Create a practical weekly grocery list:
1. Include healthy versions of what they already eat
2. Add 2-3 new items that would improve their diet for their goal
3. Group by category (Proteins, Vegetables, Grains, Dairy/Alternatives, Fruits, Pantry)

Format each category as:
*Category:*
• Item (why it's good)

Keep it concise — max 5 items per category.
    `;
    const response = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text?.trim() || 'Log more meals to get personalized grocery recommendations!';
  } catch {
    return 'Log more meals to get personalized grocery recommendations!';
  }
}

/**
 * Weekly Meal Planner — generates a 7-day meal plan.
 */
export async function generateMealPlan(targets: {
  fitnessGoal: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  gender: string;
}): Promise<string> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a sports nutritionist creating a weekly meal plan.

Goal: ${targets.fitnessGoal}
Daily targets: ${targets.dailyCalories} kcal | Protein: ${targets.dailyProtein}g | Carbs: ${targets.dailyCarbs}g | Fats: ${targets.dailyFats}g

Create a 7-day meal plan (Mon-Sun). For each day list:
- Breakfast
- Lunch  
- Dinner
- Optional: Snack

Rules:
- Keep calories within ±100 of target per day
- Hit protein targets every day
- Vary meals — don't repeat the same meal more than twice
- Use practical, easy-to-prepare meals
- Include approximate calories and protein for each meal

Format:
*📅 Monday*
🌅 Breakfast: [meal] (~Xcal, Xg P)
🍽️ Lunch: [meal] (~Xcal, Xg P)
🌙 Dinner: [meal] (~Xcal, Xg P)

[continue for all 7 days]
    `;
    const response = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text?.trim() || 'Failed to generate meal plan. Please try again.';
  } catch {
    return 'Failed to generate meal plan. Please try again.';
  }
}

/**
 * Food Substitution — healthier alternatives for a given food.
 */
export async function generateFoodSubstitution(foodName: string, fitnessGoal: string): Promise<string> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a nutritionist. The user wants healthier alternatives to: "${foodName}"
User's goal: ${fitnessGoal}

Provide:
1. Brief calorie/macro info for "${foodName}"
2. 3-4 healthier alternatives with calorie comparison
3. Why each alternative is better for their goal

Format:
🍔 *${foodName}*
~XXX kcal | Xg P | Xg C | Xg F

✅ *Healthier Alternatives:*
• [Alternative] — ~XXX kcal (saves XXX kcal) — [why]

Keep it concise and practical.
    `;
    const response = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text?.trim() || `Try grilled chicken, turkey burgers, or a veggie wrap as alternatives to ${foodName}.`;
  } catch {
    return `Try grilled chicken, turkey burgers, or a veggie wrap as alternatives to ${foodName}.`;
  }
}
