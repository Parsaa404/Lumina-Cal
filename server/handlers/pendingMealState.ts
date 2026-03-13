/**
 * Stores pending meal analyses waiting for:
 * 1. User clarification (cooking method / portion corrections)
 * 2. Final user confirmation (Log / Discard)
 *
 * Key: `${telegramId}_${botMessageId}`
 * Auto-expires after 15 minutes.
 */

import { VisionAnalysisResult } from '../services/nutrition/visionFallback';

export type PendingStep =
  | 'awaiting_clarification'  // waiting for cooking/portion details
  | 'awaiting_confirm';       // preview shown, waiting for ✅/❌

export interface PendingMeal {
  step: PendingStep;
  analysis: VisionAnalysisResult;
  userId: string;
  telegramMessageId?: number;
  photoUrl?: string;
  base64Image?: string;       // kept for re-analysis after clarification
  mimeType?: string;
  botMessageId: number;       // the bot's own message (to edit it)
  timestamp: number;
}

const EXPIRY = 15 * 60 * 1000; // 15 minutes
const pendingMeals = new Map<string, PendingMeal>();

// Map from telegramId -> their active botMessageId (for text interception)
const userActivePending = new Map<number, number>();

function makeKey(telegramId: number, botMessageId: number): string {
  return `${telegramId}_${botMessageId}`;
}

export function setPendingMeal(
  telegramId: number,
  data: Omit<PendingMeal, 'timestamp'>
): void {
  const key = makeKey(telegramId, data.botMessageId);

  // Cleanup expired
  for (const [k, v] of pendingMeals) {
    if (Date.now() - v.timestamp > EXPIRY) pendingMeals.delete(k);
  }

  pendingMeals.set(key, { ...data, timestamp: Date.now() });
  userActivePending.set(telegramId, data.botMessageId);
}

export function getPendingMeal(telegramId: number, botMessageId: number): PendingMeal | null {
  const key = makeKey(telegramId, botMessageId);
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
  const botMessageId = userActivePending.get(telegramId);
  if (botMessageId === undefined) return null;
  return getPendingMeal(telegramId, botMessageId);
}

export function updatePendingMeal(
  telegramId: number,
  botMessageId: number,
  updates: Partial<PendingMeal>
): void {
  const key = makeKey(telegramId, botMessageId);
  const entry = pendingMeals.get(key);
  if (entry) pendingMeals.set(key, { ...entry, ...updates });
}

export function deletePendingMeal(telegramId: number, botMessageId: number): void {
  pendingMeals.delete(makeKey(telegramId, botMessageId));
  userActivePending.delete(telegramId);
}

export function hasActivePending(telegramId: number): boolean {
  const botMessageId = userActivePending.get(telegramId);
  if (botMessageId === undefined) return false;
  const pending = getPendingMeal(telegramId, botMessageId);
  return pending !== null;
}
