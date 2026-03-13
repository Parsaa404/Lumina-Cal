/**
 * In-memory cache for food analysis results.
 * Caches text-based food queries to avoid redundant AI calls.
 * Key: normalized food text (lowercase, trimmed)
 * Value: { result, timestamp }
 */

import { VisionAnalysisResult } from '../services/nutrition/visionFallback';

interface CacheEntry {
  result: VisionAnalysisResult;
  timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500;

const foodCache = new Map<string, CacheEntry>();

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')       // collapse whitespace
    .replace(/[^\w\s]/g, '');    // remove punctuation
}

export function getCachedFood(text: string): VisionAnalysisResult | null {
  const key = normalizeKey(text);
  const entry = foodCache.get(key);
  
  if (!entry) return null;
  
  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    foodCache.delete(key);
    return null;
  }
  
  return entry.result;
}

export function setCachedFood(text: string, result: VisionAnalysisResult): void {
  const key = normalizeKey(text);
  
  // Evict oldest entries if cache is full
  if (foodCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = foodCache.keys().next().value;
    if (oldestKey) foodCache.delete(oldestKey);
  }
  
  foodCache.set(key, { result, timestamp: Date.now() });
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: foodCache.size, maxSize: MAX_CACHE_SIZE };
}
