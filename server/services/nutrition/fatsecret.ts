import { NutritionBreakdown } from '../../../shared/types';

// Example FatSecret Integration (2026 Platform API)
// In a real app, you would use OAuth 2.0 Client Credentials flow to get a token.

export interface FatSecretProduct {
  id: string;
  name: string;
  nutrition: NutritionBreakdown;
}

export async function getFatSecretToken(): Promise<string | null> {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials&scope=basic'
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error fetching FatSecret token:', error);
    return null;
  }
}

export async function searchFoodByBarcode(barcode: string): Promise<FatSecretProduct | null> {
  const token = await getFatSecretToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.find_id_for_barcode&barcode=${barcode}&format=json`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    const foodId = data?.food_id?.value;
    
    if (!foodId) return null;
    
    // Fetch detailed info
    const detailsResponse = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.get.v3&food_id=${foodId}&format=json`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const details = await detailsResponse.json();
    const serving = details?.food?.servings?.serving?.[0]; // Assuming first serving
    
    if (!serving) return null;

    return {
      id: foodId,
      name: details.food.food_name,
      nutrition: {
        calories: parseFloat(serving.calories || '0'),
        protein: parseFloat(serving.protein || '0'),
        carbs: parseFloat(serving.carbohydrate || '0'),
        fats: parseFloat(serving.fat || '0'),
        fiber: parseFloat(serving.fiber || '0'),
        sugar: parseFloat(serving.sugar || '0'),
        sodium: parseFloat(serving.sodium || '0'),
      }
    };
  } catch (error) {
    console.error('FatSecret barcode lookup error:', error);
    return null;
  }
}

// Example image recognition endpoint (FatSecret Vision API)
export async function analyzeImageFatSecret(imageUrl: string): Promise<any | null> {
  const token = await getFatSecretToken();
  if (!token) return null;
  
  // Note: FatSecret doesn't have a direct public "image recognition" endpoint in the same way as Gemini, 
  // but they do have image search capabilities in some enterprise tiers. 
  // We will primarily rely on Gemini for vision as implemented in visionFallback.ts.
  return null;
}
