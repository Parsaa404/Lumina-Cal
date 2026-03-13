/**
 * Smart Portion Memory.
 * Tracks typical portions a user has logged for repeated foods.
 * Key: telegramId_normalizedFoodName
 */

interface PortionEntry {
  portions: number[];       // list of portion sizes logged (grams)
  lastUpdated: number;
}

const portionMemory = new Map<string, PortionEntry>();

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_');
}

export function recordPortion(telegramId: number, foodName: string, grams: number): void {
  const key = `${telegramId}_${normalizeName(foodName)}`;
  const entry = portionMemory.get(key) || { portions: [], lastUpdated: Date.now() };
  entry.portions.push(grams);
  // Keep last 10 entries
  if (entry.portions.length > 10) entry.portions.shift();
  entry.lastUpdated = Date.now();
  portionMemory.set(key, entry);
}

export function getTypicalPortion(telegramId: number, foodName: string): number | null {
  const key = `${telegramId}_${normalizeName(foodName)}`;
  const entry = portionMemory.get(key);
  if (!entry || entry.portions.length === 0) return null;
  // Return average of last entries
  const avg = entry.portions.reduce((a, b) => a + b, 0) / entry.portions.length;
  return Math.round(avg);
}

export function getFrequentFoods(telegramId: number): string[] {
  const results: { name: string; count: number }[] = [];
  for (const [key, entry] of portionMemory) {
    if (key.startsWith(`${telegramId}_`)) {
      const name = key.replace(`${telegramId}_`, '').replace(/_/g, ' ');
      results.push({ name, count: entry.portions.length });
    }
  }
  return results
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(r => r.name);
}
