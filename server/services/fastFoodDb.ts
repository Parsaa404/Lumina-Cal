/**
 * Built-in fast food / restaurant database.
 * Provides instant accurate nutrition data for common menu items.
 * Used before falling back to AI estimation.
 */

export interface FastFoodItem {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

const DB: FastFoodItem[] = [
  // McDonald's
  { name: "Big Mac",              brand: "McDonald's", calories: 550, protein: 25, carbs: 46, fats: 30, sugar: 9, sodium: 1010, fiber: 3 },
  { name: "Quarter Pounder",      brand: "McDonald's", calories: 520, protein: 30, carbs: 42, fats: 26, sugar: 10, sodium: 1090 },
  { name: "McChicken",            brand: "McDonald's", calories: 400, protein: 14, carbs: 42, fats: 17, sugar: 5, sodium: 590 },
  { name: "Filet-O-Fish",         brand: "McDonald's", calories: 390, protein: 16, carbs: 38, fats: 19, sugar: 5, sodium: 580 },
  { name: "Medium Fries",         brand: "McDonald's", calories: 360, protein: 4,  carbs: 44, fats: 17, fiber: 4, sodium: 400 },
  { name: "Large Fries",          brand: "McDonald's", calories: 490, protein: 7,  carbs: 66, fats: 23, fiber: 6, sodium: 400 },
  { name: "McDouble",             brand: "McDonald's", calories: 390, protein: 22, carbs: 33, fats: 19, sugar: 7, sodium: 840 },
  { name: "Egg McMuffin",         brand: "McDonald's", calories: 310, protein: 17, carbs: 30, fats: 13, sodium: 760 },
  { name: "Pancakes",             brand: "McDonald's", calories: 580, protein: 15, carbs: 102, fats: 15, sugar: 45, sodium: 1290 },
  { name: "Vanilla McFlurry",     brand: "McDonald's", calories: 510, protein: 11, carbs: 80, fats: 16, sugar: 65 },
  { name: "Caesar Salad",         brand: "McDonald's", calories: 90,  protein: 7,  carbs: 9, fats: 4, fiber: 2, sodium: 190 },

  // KFC
  { name: "Original Recipe Chicken Breast", brand: "KFC", calories: 390, protein: 39, carbs: 11, fats: 21, sodium: 1060 },
  { name: "Zinger Burger",        brand: "KFC",          calories: 520, protein: 29, carbs: 50, fats: 23, sodium: 1190 },
  { name: "Popcorn Chicken",      brand: "KFC",          calories: 400, protein: 26, carbs: 22, fats: 24, sodium: 970 },
  { name: "Coleslaw",             brand: "KFC",          calories: 140, protein: 1,  carbs: 16, fats: 8, sugar: 12 },

  // Subway
  { name: "6-inch Chicken Teriyaki", brand: "Subway",   calories: 380, protein: 26, carbs: 61, fats: 5, fiber: 4, sodium: 830 },
  { name: "6-inch Turkey Breast",    brand: "Subway",   calories: 280, protein: 18, carbs: 46, fats: 4, fiber: 4, sodium: 820 },
  { name: "6-inch BMT",             brand: "Subway",    calories: 470, protein: 22, carbs: 48, fats: 21, fiber: 4, sodium: 1530 },
  { name: "6-inch Veggie Delite",   brand: "Subway",    calories: 230, protein: 9,  carbs: 44, fats: 2, fiber: 4, sodium: 510 },
  { name: "6-inch Tuna",            brand: "Subway",    calories: 480, protein: 21, carbs: 46, fats: 24, sodium: 800 },

  // Starbucks
  { name: "Caramel Frappuccino Venti", brand: "Starbucks", calories: 510, protein: 7, carbs: 88, fats: 14, sugar: 83, sodium: 330 },
  { name: "Caffe Latte Grande",        brand: "Starbucks", calories: 190, protein: 13, carbs: 19, fats: 7, sugar: 18 },
  { name: "Americano",                 brand: "Starbucks", calories: 15,  protein: 1,  carbs: 3, fats: 0, sodium: 10 },
  { name: "Flat White",                brand: "Starbucks", calories: 220, protein: 12, carbs: 19, fats: 11, sugar: 18 },
  { name: "Blueberry Muffin",          brand: "Starbucks", calories: 380, protein: 5,  carbs: 59, fats: 14, sugar: 31, fiber: 2 },

  // Burger King
  { name: "Whopper",              brand: "Burger King",  calories: 660, protein: 28, carbs: 49, fats: 40, sugar: 11, sodium: 980 },
  { name: "Chicken Royale",       brand: "Burger King",  calories: 600, protein: 26, carbs: 55, fats: 32, sodium: 1250 },
  { name: "Double Whopper",       brand: "Burger King",  calories: 900, protein: 46, carbs: 49, fats: 58, sodium: 1130 },

  // Pizza Hut
  { name: "Margherita Pizza Slice",    brand: "Pizza Hut", calories: 270, protein: 11, carbs: 36, fats: 9, sodium: 640 },
  { name: "Pepperoni Pizza Slice",     brand: "Pizza Hut", calories: 360, protein: 15, carbs: 36, fats: 18, sodium: 850 },
  { name: "BBQ Chicken Pizza Slice",   brand: "Pizza Hut", calories: 310, protein: 17, carbs: 39, fats: 10, sodium: 820 },

  // Domino's
  { name: "Pepperoni Pizza Slice",     brand: "Domino's", calories: 375, protein: 16, carbs: 41, fats: 17, sodium: 890 },
  { name: "Cheese Garlic Bread",       brand: "Domino's", calories: 230, protein: 7,  carbs: 33, fats: 8, sodium: 530 },

  // Common foods
  { name: "Boiled Egg",           brand: "Generic", calories: 78,  protein: 6,  carbs: 1, fats: 5 },
  { name: "Scrambled Eggs (2)",   brand: "Generic", calories: 200, protein: 14, carbs: 2, fats: 15, sodium: 220 },
  { name: "Chicken Breast 100g",  brand: "Generic", calories: 165, protein: 31, carbs: 0, fats: 4, sodium: 74 },
  { name: "White Rice 1 cup",     brand: "Generic", calories: 206, protein: 4,  carbs: 45, fats: 0, fiber: 1 },
  { name: "Brown Rice 1 cup",     brand: "Generic", calories: 216, protein: 5,  carbs: 45, fats: 2, fiber: 4 },
  { name: "Oatmeal 1 cup",        brand: "Generic", calories: 154, protein: 5,  carbs: 28, fats: 3, fiber: 4, sugar: 1 },
  { name: "Banana",               brand: "Generic", calories: 105, protein: 1,  carbs: 27, fats: 0, fiber: 3, sugar: 14 },
  { name: "Apple",                brand: "Generic", calories: 95,  protein: 0,  carbs: 25, fats: 0, fiber: 4, sugar: 19 },
  { name: "Greek Yogurt 150g",    brand: "Generic", calories: 100, protein: 17, carbs: 6, fats: 1, sugar: 4 },
  { name: "Avocado Half",         brand: "Generic", calories: 120, protein: 1,  carbs: 6, fats: 11, fiber: 5 },
  { name: "Almonds 30g",          brand: "Generic", calories: 170, protein: 6,  carbs: 6, fats: 15, fiber: 3 },
  { name: "Salmon 100g",          brand: "Generic", calories: 208, protein: 20, carbs: 0, fats: 13, sodium: 59 },
  { name: "Tuna Canned 100g",     brand: "Generic", calories: 116, protein: 26, carbs: 0, fats: 1, sodium: 320 },
  { name: "Pasta 100g dry",       brand: "Generic", calories: 371, protein: 13, carbs: 74, fats: 2, fiber: 3 },
  { name: "Sweet Potato 1 medium",brand: "Generic", calories: 103, protein: 2,  carbs: 24, fats: 0, fiber: 4, sugar: 7 },
  { name: "Broccoli 100g",        brand: "Generic", calories: 55,  protein: 4,  carbs: 11, fats: 1, fiber: 5 },
  { name: "Protein Shake (1 scoop)", brand: "Generic", calories: 120, protein: 25, carbs: 4, fats: 1, sugar: 2 },
  { name: "Milk 250ml",           brand: "Generic", calories: 149, protein: 8,  carbs: 11, fats: 8, calcium: 300, sugar: 12 } as any,
];

/**
 * Search the fast food database by name or brand.
 * Returns best matching item or null if confidence is low.
 */
export function searchFastFood(query: string): FastFoodItem | null {
  const q = query.toLowerCase().trim();

  // Exact match first
  const exact = DB.find(item =>
    item.name.toLowerCase() === q ||
    `${item.brand} ${item.name}`.toLowerCase() === q
  );
  if (exact) return exact;

  // Fuzzy: find items where query words appear in name or brand
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const scored = DB.map(item => {
    const full = `${item.brand} ${item.name}`.toLowerCase();
    const matches = words.filter(w => full.includes(w)).length;
    return { item, score: matches / words.length };
  }).filter(r => r.score >= 0.6);

  if (scored.length === 0) return null;
  return scored.sort((a, b) => b.score - a.score)[0].item;
}

export function searchFastFoodAll(query: string): FastFoodItem[] {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  return DB
    .map(item => {
      const full = `${item.brand} ${item.name}`.toLowerCase();
      const matches = words.filter(w => full.includes(w)).length;
      return { item, score: matches / Math.max(words.length, 1) };
    })
    .filter(r => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.item);
}
