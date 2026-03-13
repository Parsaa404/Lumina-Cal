/**
 * Pending meal state — tracks multi-step photo Q&A and confirmation flow.
 * Steps (photo): 'q_cooking' → 'q_seasoning' → 'q_portions' → 'awaiting_confirm'
 * Steps (text):  'awaiting_confirm'
 */

import { VisionAnalysisResult } from '../services/nutrition/visionFallback';

export type PendingStep =
  | 'q_cooking'           // waiting for Q1: cooking method
  | 'q_seasoning'         // waiting for Q2: seasonings / sauces
  | 'q_portions'          // waiting for Q3: exact portions/grams
  | 'awaiting_confirm';   // preview shown, waiting for ✅ / ❌

export interface PendingMeal {
  step: PendingStep;
  analysis: VisionAnalysisResult;
  userId: string;
  telegramMessageId?: number;
  photoUrl?: string;
  base64Image?: string;       // kept so we can re-analyze after all Qs answered
  mimeType?: string;
  botMessageId: number;       // bot message ID to edit
  timestamp: number;
  // Accumulated answers
  cookingMethod?: string;
  seasonings?: string;
  portions?: string;
}

const EXPIRY = 15 * 60 * 1000; // 15 minutes
const pendingMeals     = new Map<string, PendingMeal>();
const userActivePending = new Map<number, number>();   // telegramId → botMessageId

function makeKey(telegramId: number, botMessageId: number): string {
  return `${telegramId}_${botMessageId}`;
}

export function setPendingMeal(telegramId: number, data: Omit<PendingMeal, 'timestamp'>): void {
  // Cleanup expired entries
  for (const [k, v] of pendingMeals) {
    if (Date.now() - v.timestamp > EXPIRY) pendingMeals.delete(k);
  }
  const key = makeKey(telegramId, data.botMessageId);
  pendingMeals.set(key, { ...data, timestamp: Date.now() });
  userActivePending.set(telegramId, data.botMessageId);
}

export function getPendingMeal(telegramId: number, botMessageId: number): PendingMeal | null {
  const key   = makeKey(telegramId, botMessageId);
  const entry = pendingMeals.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > EXPIRY) {
    pendingMeals.delete(key);
    userActivePending.delete(telegramId);
    return null;
  }
  return entry;
}

export function getActivePending(telegramId: number): PendingMeal | null {
  const id = userActivePending.get(telegramId);
  if (id === undefined) return null;
  return getPendingMeal(telegramId, id);
}

export function updatePendingMeal(telegramId: number, botMessageId: number, updates: Partial<PendingMeal>): void {
  const key   = makeKey(telegramId, botMessageId);
  const entry = pendingMeals.get(key);
  if (entry) pendingMeals.set(key, { ...entry, ...updates });
}

export function deletePendingMeal(telegramId: number, botMessageId: number): void {
  pendingMeals.delete(makeKey(telegramId, botMessageId));
  userActivePending.delete(telegramId);
}

export function hasActivePending(telegramId: number): boolean {
  const id = userActivePending.get(telegramId);
  return id !== undefined && getPendingMeal(telegramId, id) !== null;
}
