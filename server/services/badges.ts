import { db } from '../services/db';
import { User, DailySummary } from '../../shared/types';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: 'streak' | 'protein' | 'hydration' | 'weight' | 'activity' | 'logging';
}

// All available badges
export const ALL_BADGES: Badge[] = [
  // Streak badges
  { id: 'streak_3',    emoji: '🏅', name: '3-Day Warrior',   description: 'Logged meals 3 days in a row',       category: 'streak' },
  { id: 'streak_7',    emoji: '🏆', name: 'Week Champion',   description: 'Logged meals 7 days in a row',       category: 'streak' },
  { id: 'streak_14',   emoji: '💎', name: '2-Week Legend',   description: 'Logged meals 14 days in a row',      category: 'streak' },
  { id: 'streak_30',   emoji: '👑', name: 'Monthly Master',  description: 'Logged meals 30 days in a row',      category: 'streak' },
  { id: 'streak_60',   emoji: '🦾', name: 'Iron Will',       description: 'Logged meals 60 days in a row',      category: 'streak' },
  { id: 'streak_100',  emoji: '🌟', name: 'Centurion',       description: 'Logged meals 100 days in a row',     category: 'streak' },
  // Protein badges
  { id: 'protein_3',   emoji: '💪', name: 'Protein Apprentice', description: 'Hit protein goal 3 days in a row', category: 'protein' },
  { id: 'protein_7',   emoji: '🥩', name: 'Protein Warrior',    description: 'Hit protein goal 7 days in a row', category: 'protein' },
  { id: 'protein_30',  emoji: '👑', name: 'Protein King',       description: 'Hit protein goal 30 days in a row', category: 'protein' },
  // Hydration badges
  { id: 'water_7',     emoji: '💧', name: 'Hydration Hero',  description: 'Hit water goal 7 days in a row',     category: 'hydration' },
  { id: 'water_14',    emoji: '🌊', name: 'Water Warrior',   description: 'Hit water goal 14 days in a row',    category: 'hydration' },
  // Weight badges
  { id: 'first_weight',emoji: '⚖️', name: 'Scale Starter',  description: 'Logged your first weight',            category: 'weight' },
  { id: 'weight_goal', emoji: '🎯', name: 'Goal Crusher',   description: 'Reached your target weight',          category: 'weight' },
  { id: 'weight_10',   emoji: '📉', name: 'Down 10kg',      description: 'Lost 10kg from starting weight',      category: 'weight' },
  // Activity badges
  { id: 'activity_7',  emoji: '🏃', name: 'Active Week',    description: 'Logged activity 7 days in a row',    category: 'activity' },
  { id: 'activity_30', emoji: '🔥', name: 'Fitness Fanatic', description: 'Logged activity 30 days in a row',  category: 'activity' },
  // Logging badges
  { id: 'meals_10',    emoji: '🍽️', name: 'Meal Tracker',  description: 'Logged 10 meals total',               category: 'logging' },
  { id: 'meals_50',    emoji: '🍴', name: 'Food Logger',    description: 'Logged 50 meals total',               category: 'logging' },
  { id: 'meals_100',   emoji: '🧑‍🍳', name: 'Culinary Expert', description: 'Logged 100 meals total',         category: 'logging' },
];

// Compute which badges a user has earned
export async function computeEarnedBadges(user: User): Promise<Badge[]> {
  const earned: Badge[] = [];
  const streak = user.streak || 0;

  // Streak badges
  for (const b of ALL_BADGES.filter(b => b.category === 'streak')) {
    const days = parseInt(b.id.replace('streak_', ''));
    if (streak >= days) earned.push(b);
  }

  // First weight badge
  try {
    const wh = await db.getWeightHistory(user.id);
    if (wh.length > 0) {
      earned.push(ALL_BADGES.find(b => b.id === 'first_weight')!);
    }
    // Down 10kg badge
    if (wh.length >= 2) {
      const firstW = wh[0].weight;
      const lastW  = wh[wh.length - 1].weight;
      if (firstW - lastW >= 10) {
        earned.push(ALL_BADGES.find(b => b.id === 'weight_10')!);
      }
    }
  } catch { /* ignore */ }

  // Count total meals
  try {
    const { meals } = await db.getDailySummary(user.id, '__all__') || { meals: [] };
    // Just use weekly as proxy for now
  } catch { /* ignore */ }

  return earned.filter(Boolean);
}

// Check if a badge was just earned (for notification)
export async function checkNewBadges(
  user: User,
  prevStreak: number
): Promise<Badge[]> {
  const newBadges: Badge[] = [];
  const streak = user.streak || 0;

  for (const b of ALL_BADGES.filter(b => b.category === 'streak')) {
    const days = parseInt(b.id.replace('streak_', ''));
    if (streak >= days && prevStreak < days) {
      newBadges.push(b);
    }
  }

  return newBadges;
}

// Format badge list for Telegram
export function formatBadges(badges: Badge[]): string {
  if (badges.length === 0) return '_No badges yet — keep going!_ 💪';

  const byCategory: Record<string, Badge[]> = {};
  for (const b of badges) {
    if (!byCategory[b.category]) byCategory[b.category] = [];
    byCategory[b.category].push(b);
  }

  const categoryNames: Record<string, string> = {
    streak: '🔥 Streak', protein: '🥩 Protein',
    hydration: '💧 Hydration', weight: '⚖️ Weight',
    activity: '🏃 Activity', logging: '🍽️ Logging',
  };

  let msg = '';
  for (const [cat, list] of Object.entries(byCategory)) {
    msg += `*${categoryNames[cat] || cat}*\n`;
    for (const b of list) {
      msg += `${b.emoji} ${b.name} — _${b.description}_\n`;
    }
    msg += '\n';
  }
  return msg;
}
