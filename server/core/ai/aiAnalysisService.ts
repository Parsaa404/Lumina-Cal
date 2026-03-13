/**
 * AI Analysis Service — unified facade. Swap Gemini for GPT/Claude here.
 */

import { GoogleGenAI } from '@google/genai';

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _ai;
}
const MODEL = 'gemini-2.5-flash';

export async function analyzeFoodPhoto(base64: string, mime: string, ctx?: string) {
  const { analyzeFoodImage, analyzeFoodImageWithContext } = await import('../../services/nutrition/visionFallback');
  return ctx ? analyzeFoodImageWithContext(base64, mime, ctx) : analyzeFoodImage(base64, mime);
}

export async function parseMealText(text: string) {
  const { analyzeFoodText } = await import('../../services/nutrition/visionFallback');
  return analyzeFoodText(text);
}

export async function answerNutritionQuestion(question: string, userCtx?: string): Promise<string> {
  const prompt = `You are a professional nutritionist AI.\n${userCtx ? `User context: ${userCtx}\n` : ''}Question: "${question}"\nAnswer concisely (max 150 words), evidence-based. End with one actionable tip.`;
  const r = await getAI().models.generateContent({ model: MODEL, contents: prompt });
  return r.text?.trim() || 'Unable to answer right now.';
}

export async function generateFoodSwaps(foodName: string, goal: string): Promise<string> {
  const { generateFoodSubstitution } = await import('../recommendation/recommendationEngine');
  return generateFoodSubstitution(foodName, goal);
}

export async function generateWeeklyNarrative(stats: {
  avgCalories: number; avgProtein: number; goal: string;
  calTarget: number; proteinTarget: number; avgMealScore: number;
}): Promise<string> {
  const prompt = `Nutrition coach reviewing a client's week:\nGoal: ${stats.goal}\nAvg calories: ${stats.avgCalories}/${stats.calTarget}\nAvg protein: ${stats.avgProtein}g/${stats.proteinTarget}g\nAvg meal score: ${stats.avgMealScore}/10\nWrite 2-3 encouraging sentences. One concrete improvement for next week.`;
  const r = await getAI().models.generateContent({ model: MODEL, contents: prompt });
  return r.text?.trim() || 'Keep tracking consistently!';
}
