/**
 * Activity tracking — estimates calories burned from exercise.
 * MET-based calculation: Calories = MET × weight(kg) × time(hours)
 */

export interface ActivityEntry {
  type: string;
  durationMin: number;
  caloriesBurned: number;
  timestamp: number;
}

interface DayActivity {
  entries: ActivityEntry[];
  date: string;
}

const activityLog = new Map<string, DayActivity>();

// MET values (Metabolic Equivalent of Task)
const MET_TABLE: Record<string, { met: number; label: string }> = {
  run:      { met: 9.8,  label: 'Running' },
  running:  { met: 9.8,  label: 'Running' },
  jog:      { met: 7.0,  label: 'Jogging' },
  jogging:  { met: 7.0,  label: 'Jogging' },
  walk:     { met: 3.5,  label: 'Walking' },
  walking:  { met: 3.5,  label: 'Walking' },
  swim:     { met: 7.0,  label: 'Swimming' },
  swimming: { met: 7.0,  label: 'Swimming' },
  bike:     { met: 7.5,  label: 'Cycling' },
  cycling:  { met: 7.5,  label: 'Cycling' },
  gym:      { met: 5.0,  label: 'Gym / Weight Training' },
  weights:  { met: 5.0,  label: 'Weight Training' },
  hiit:     { met: 10.0, label: 'HIIT' },
  yoga:     { met: 2.5,  label: 'Yoga' },
  pilates:  { met: 3.0,  label: 'Pilates' },
  jump:     { met: 10.0, label: 'Jump Rope' },
  dance:    { met: 5.5,  label: 'Dancing' },
  football: { met: 8.0,  label: 'Football / Soccer' },
  basketball:{ met: 8.0, label: 'Basketball' },
  tennis:   { met: 7.3,  label: 'Tennis' },
  climb:    { met: 5.8,  label: 'Stair Climbing' },
  stairs:   { met: 5.8,  label: 'Stair Climbing' },
  hike:     { met: 6.0,  label: 'Hiking' },
  row:      { met: 7.0,  label: 'Rowing' },
  elliptical:{ met: 5.0, label: 'Elliptical' },
  crossfit: { met: 10.0, label: 'CrossFit' },
};

function today(): string { return new Date().toISOString().split('T')[0]; }
function key(telegramId: number): string { return `${telegramId}_${today()}`; }

export function logActivity(
  telegramId: number,
  activityKey: string,
  durationMin: number,
  weightKg: number
): ActivityEntry | null {
  const activity = MET_TABLE[activityKey.toLowerCase()];
  if (!activity) return null;

  const caloriesBurned = Math.round(activity.met * weightKg * (durationMin / 60));
  const entry: ActivityEntry = {
    type: activity.label,
    durationMin,
    caloriesBurned,
    timestamp: Date.now(),
  };

  const k = key(telegramId);
  const day = activityLog.get(k) || { entries: [], date: today() };
  day.entries.push(entry);
  activityLog.set(k, day);

  return entry;
}

export function getTodayActivity(telegramId: number): { entries: ActivityEntry[]; totalBurned: number } {
  const k = key(telegramId);
  const day = activityLog.get(k) || { entries: [], date: today() };
  const totalBurned = day.entries.reduce((s, e) => s + e.caloriesBurned, 0);
  return { entries: day.entries, totalBurned };
}

export function getActivityTypes(): string[] {
  return [...new Set(Object.values(MET_TABLE).map(v => v.label))];
}
