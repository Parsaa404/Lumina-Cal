/**
 * Food cache with MD5 hash keys for consistent cache hits.
 * "200g grilled chicken" and "grilled chicken 200g" → same cache entry.
 */

import { createHash } from 'crypto';
import { VisionAnalysisResult } from './nutrition/visionFallback';

interface CacheEntry {
  result: VisionAnalysisResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SIZE = 500;
const cache = new Map<string, CacheEntry>();

function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/).sort().join(' ');
}

function hashKey(text: string): string {
  return createHash('md5').update(normalizeQuery(text)).digest('hex').slice(0, 12);
}

export function getCachedFood(query: string): VisionAnalysisResult | null {
  const key = hashKey(query);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.result;
}

export function setCachedFood(query: string, result: VisionAnalysisResult): void {
  if (cache.size >= MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(hashKey(query), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCache(): void { cache.clear(); }
export function getCacheSize(): number { return cache.size; }
