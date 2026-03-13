import { GoogleGenAI, Type } from '@google/genai';
import { NutritionBreakdown, MealScore } from '../../../shared/types';

let ai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export interface VisionAnalysisResult {
  description: string;
  nutrition: NutritionBreakdown;
  cuisineType?: string;
  confidenceScore: number;
  mealScore: MealScore;
  aiFeedback: string;
  items: { name: string; portion: string; calories: number }[];
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: 'Detailed description of all food items with estimated portions in grams' },
    cuisineType: { type: Type.STRING, description: 'Cuisine style (e.g., Italian, Asian, Fast Food)' },
    confidenceScore: { type: Type.NUMBER, description: 'Confidence 0-100 on estimation accuracy' },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Food item name' },
          portion: { type: Type.STRING, description: 'Estimated portion (e.g., "150g", "1 cup")' },
          calories: { type: Type.NUMBER, description: 'Calories for this item' },
        },
        required: ['name', 'portion', 'calories']
      },
      description: 'Individual food items on the plate'
    },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fats: { type: Type.NUMBER },
        fiber: { type: Type.NUMBER },
        sugar: { type: Type.NUMBER },
        sodium: { type: Type.NUMBER },
      },
      required: ['calories', 'protein', 'carbs', 'fats']
    },
    mealScore: {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.NUMBER, description: 'Meal score 1-10 based on nutritional quality, balance, and healthiness' },
        pros: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Positive nutritional aspects (e.g., "High protein", "Good fiber")'
        },
        cons: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Areas for improvement (e.g., "High sodium", "Low fiber")'
        },
      },
      required: ['overall', 'pros', 'cons']
    },
    aiFeedback: { type: Type.STRING, description: 'Smart nutrition feedback with specific food swap suggestions. Be specific — name exact alternatives. Example: "Replace white rice with brown rice to add fiber" or "Add Greek yogurt for extra protein"' },
  },
  required: ['description', 'nutrition', 'confidenceScore', 'mealScore', 'aiFeedback', 'items']
};

export async function analyzeFoodImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult | null> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a professional nutritionist AI with expertise in food identification.

Analyze this meal image in detail:

1. **Plate Segmentation**: Identify ALL visible food items separately with individual portions
2. **Portion Estimation**: Estimate each item's weight in grams based on visual cues (plate size, utensils for scale)
3. **Cooking Method**: Identify how each item was prepared (grilled, fried, steamed, raw, etc.) — this affects calorie count significantly
4. **Cuisine Recognition**: Identify the cuisine style if recognizable
5. **Nutritional Breakdown**: Provide accurate total nutrition: calories, protein (g), carbs (g), fats (g), fiber (g), sugar (g), sodium (mg)
6. **Meal Score**: Rate this meal 1-10 based on:
   - Nutritional balance (protein/carbs/fats ratio)
   - Micronutrient diversity (vegetables, whole grains)
   - Processing level (whole foods vs processed)
   - Portion appropriateness
7. **Smart Feedback**: Give 1-2 specific, actionable food swap suggestions. Be concrete — name exact alternative foods.

Important: Be accurate with portions. A typical dinner plate is ~26cm diameter. Use utensils and hands as size references.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    
    return JSON.parse(jsonStr) as VisionAnalysisResult;
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    return null;
  }
}

export async function analyzeFoodText(text: string): Promise<VisionAnalysisResult | null> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a professional nutritionist AI.

Analyze this food description: "${text}"

1. Identify all food items and estimate realistic portion sizes if not provided
2. Account for cooking method if mentioned (fried adds ~30% more calories than grilled)
3. Provide detailed nutritional breakdown: calories, protein (g), carbs (g), fats (g), fiber (g), sugar (g), sodium (mg)
4. Identify cuisine style
5. Rate the meal 1-10 for nutritional quality with specific pros and cons
6. Give 1-2 specific food swap suggestions to improve the meal

Be precise with portions — use standard serving sizes when the user doesn't specify.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    
    return JSON.parse(jsonStr) as VisionAnalysisResult;
  } catch (error) {
    console.error('Error analyzing text with Gemini:', error);
    return null;
  }
}

/**
 * Re-analyze the same image with user-provided corrections.
 * Much more accurate than the initial visual estimate.
 */
export async function analyzeFoodImageWithContext(
  base64Image: string,
  mimeType: string,
  userContext: string
): Promise<VisionAnalysisResult | null> {
  try {
    const genAI = getGenAI();
    const prompt = `
You are a professional nutritionist AI re-analyzing a meal photo.

The user provided these corrections:
"${userContext}"

Use BOTH the image AND the user info. Key rules:
- Cooking method changes calories significantly:
  • Deep-fried: +30-50% calories from oil
  • Pan-fried with 1 tbsp oil: +120 kcal, 14g fat
  • Grilled/boiled/steamed: base calories only
- Added seasonings/sauces:
  • Olive oil 1 tbsp: 120 kcal, 14g fat
  • Butter 1 tbsp: 100 kcal, 11g fat
  • Sweet/teriyaki sauce: +40-80 kcal
  • Salt 1 tsp: +2300mg sodium
- If user gave exact gram/cup amounts, use those PRECISELY (override visual estimates)

Return updated item list with corrected portions, full recalculated macros, updated meal score and feedback.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as VisionAnalysisResult;
  } catch (error) {
    console.error('Error re-analyzing with context:', error);
    return null;
  }
}
