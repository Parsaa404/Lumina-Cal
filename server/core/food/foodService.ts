/**
 * Food Service — unified lookup: fast food DB → MD5 cache → AI.
 * Swappable: plug in FatSecret, Nutritionix, OpenFoodFacts here.
 */

import { searchFastFood, FastFoodItem } from '../../services/fastFoodDb';
import { getCachedFood, setCachedFood } from '../../services/foodCache';
import { VisionAnalysisResult } from '../../services/nutrition/visionFallback';

export interface FoodSearchResult {
  source: 'database' | 'cache' | 'ai';
  confidence: number;
  item: VisionAnalysisResult;
}

export async function searchFood(query: string): Promise<FoodSearchResult | null> {
  const dbHit = searchFastFood(query);
  if (dbHit) return { source: 'database', confidence: 99, item: fastFoodToResult(dbHit) };

  const cached = getCachedFood(query);
  if (cached) return { source: 'cache', confidence: 85, item: cached };

  try {
    const { analyzeFoodText } = await import('../../services/nutrition/visionFallback');
    const result = await analyzeFoodText(query);
    if (result) {
      setCachedFood(query, result);
      return { source: 'ai', confidence: result.confidenceScore, item: result };
    }
  } catch (err) {
    console.error('AI food analysis failed:', err);
  }
  return null;
}

/** Photo AI Accuracy Trick: replace AI estimates with DB values where available. */
export async function enrichWithDatabaseNutrition(
  aiResult: VisionAnalysisResult
): Promise<VisionAnalysisResult> {
  if (!aiResult.items || aiResult.items.length === 0) return aiResult;
  let total = { cal: 0, pro: 0, car: 0, fat: 0, fib: 0, sug: 0, sod: 0 };
  let hits = 0;
  for (const item of aiResult.items) {
    const db = searchFastFood(item.name);
    if (db) {
      hits++;
      total.cal += db.calories; total.pro += db.protein; total.car += db.carbs; total.fat += db.fats;
      total.fib += db.fiber || 0; total.sug += db.sugar || 0; total.sod += db.sodium || 0;
    } else {
      const n = aiResult.nutrition;
      const share = 1 / aiResult.items.length;
      total.cal += item.calories; total.pro += n.protein * share; total.car += n.carbs * share; total.fat += n.fats * share;
    }
  }
  if (hits === 0) return aiResult;
  return {
    ...aiResult,
    nutrition: { calories: total.cal, protein: total.pro, carbs: total.car, fats: total.fat, fiber: total.fib, sugar: total.sug, sodium: total.sod },
    confidenceScore: Math.round((aiResult.confidenceScore * (aiResult.items.length - hits) + 99 * hits) / aiResult.items.length),
  };
}

function fastFoodToResult(item: FastFoodItem): VisionAnalysisResult {
  return {
    description: `${item.brand} ${item.name}`, cuisineType: item.brand, confidenceScore: 99,
    nutrition: { calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fats, fiber: item.fiber || 0, sugar: item.sugar || 0, sodium: item.sodium || 0 },
    items: [{ name: item.name, portion: '1 serving', calories: item.calories }],
    mealScore: { overall: 5, pros: ['Database-verified nutrition'], cons: item.sodium && item.sodium > 800 ? ['High sodium'] : [] },
    aiFeedback: `Exact nutrition from ${item.brand} official data.`,
  };
}
