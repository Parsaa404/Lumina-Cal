/**
 * Hydration Tracking — daily water intake.
 * Stored in-memory (keyed by telegramId + date).
 * Can be moved to Supabase for persistence.
 */

interface WaterEntry {
  ml: number;
  date: string; // YYYY-MM-DD
}

const waterLog = new Map<string, WaterEntry>();

function makeKey(telegramId: number, date: string): string {
  return `${telegramId}_${date}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function addWater(telegramId: number, ml: number): number {
  const key = makeKey(telegramId, today());
  const current = waterLog.get(key) || { ml: 0, date: today() };
  const updated = { ml: current.ml + ml, date: today() };
  waterLog.set(key, updated);
  return updated.ml;
}

export function getWaterToday(telegramId: number): number {
  const key = makeKey(telegramId, today());
  return waterLog.get(key)?.ml || 0;
}

export function resetWaterToday(telegramId: number): void {
  const key = makeKey(telegramId, today());
  waterLog.delete(key);
}
