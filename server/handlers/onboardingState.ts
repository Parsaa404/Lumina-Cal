/**
 * In-memory session state for tracking user onboarding progress.
 * Each user's onboarding data is stored by their Telegram ID.
 */

export type OnboardingStep = 'gender' | 'height' | 'weight' | 'age' | 'goal' | 'done';

export interface OnboardingData {
  step: OnboardingStep;
  gender?: 'male' | 'female';
  height?: number;  // cm
  weight?: number;  // kg
  age?: number;
  fitnessGoal?: string;
}

// Map of telegramId -> onboarding data
const onboardingState = new Map<number, OnboardingData>();

export function startOnboarding(telegramId: number): void {
  onboardingState.set(telegramId, { step: 'gender' });
}

export function getOnboarding(telegramId: number): OnboardingData | undefined {
  return onboardingState.get(telegramId);
}

export function updateOnboarding(telegramId: number, data: Partial<OnboardingData>): void {
  const current = onboardingState.get(telegramId);
  if (current) {
    onboardingState.set(telegramId, { ...current, ...data });
  }
}

export function clearOnboarding(telegramId: number): void {
  onboardingState.delete(telegramId);
}

export function isOnboarding(telegramId: number): boolean {
  const data = onboardingState.get(telegramId);
  return !!data && data.step !== 'done';
}
