import { Context, InlineKeyboard } from 'grammy';
import { db } from '../services/db';

// ── Session State ──────────────────────────────────────────────
interface ActivitySession {
  type: string;
  step: string;
  data: Record<string, any>;
  userId: string;
  telegramId: number;
  weight: number;
}

const sessions = new Map<number, ActivitySession>();

// ── MET values ───────────────────────────────────────────────
const MET: Record<string, number> = {
  walk_slow: 2.5,
  walk_normal: 3.5,
  walk_fast: 4.5,
  run: 9.8,
  jog: 7.0,
  swim_freestyle: 8.0,
  swim_breaststroke: 5.8,
  swim_backstroke: 6.0,
  swim_butterfly: 13.8,
  swim_mixed: 7.0,
  gym_light: 3.0,
  gym_moderate: 5.0,
  gym_heavy: 6.0,
  bike: 7.5,
  hiit: 10.0,
  yoga: 2.5,
  pilates: 3.0,
  dance: 5.5,
  football: 8.0,
  basketball: 8.0,
  tennis: 7.3,
  hike: 6.0,
  crossfit: 10.0,
  elliptical: 5.0,
  jump_rope: 10.0,
  rowing: 7.0,
};

function stepsToCalories(steps: number, weightKg: number): number {
  const distanceKm = steps * 0.000762;
  const durationHours = distanceKm / 5;
  return Math.round(3.5 * weightKg * durationHours);
}

function metCalories(met: number, weightKg: number, durationMin: number): number {
  return Math.round(met * weightKg * (durationMin / 60));
}

// ── Main Command Handler ─────────────────────────────────────
export async function handleActivity(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const weightKg = user.weight || 70;

  // Check if there's an argument (legacy: /activity run 30)
  const text = ctx.message?.text || '';
  const parts = text.trim().toLowerCase().split(/\s+/);
  const activityRaw = parts[1];

  if (activityRaw) {
    // Legacy path — start that activity's flow directly
    const type = normalizeType(activityRaw);
    if (!type) {
      await ctx.reply(`❓ Unknown activity: *${activityRaw}*`, { parse_mode: 'Markdown' });
      return;
    }
    await startActivityFlow(ctx, telegramUser.id, user.id, weightKg, type);
    return;
  }

  // Show activity selection menu
  const { entries, totalBurned } = await db.getActivityForDate(user.id, new Date());

  let msg = `🏃 *Activity Tracker*\n\nWhat activity did you do today?`;
  if (entries.length > 0) {
    msg += `\n\n*Today so far: ${totalBurned} kcal burned*`;
  }

  const kb = new InlineKeyboard()
    .text('🚶 Walking',    'act_type_walk').text('🏃 Running',  'act_type_run').row()
    .text('🏋️ Gym',        'act_type_gym').text('🏊 Swimming', 'act_type_swim').row()
    .text('🚴 Cycling',    'act_type_bike').text('⚡ HIIT',     'act_type_hiit').row()
    .text('🧘 Yoga',       'act_type_yoga').text('⛹️ Football', 'act_type_football').row()
    .text('🏀 Basketball', 'act_type_basketball').text('🎾 Tennis', 'act_type_tennis').row()
    .text('🥾 Hiking',     'act_type_hike').text('💃 Dance',   'act_type_dance').row()
    .text('🔥 CrossFit',   'act_type_crossfit').text('🛶 Rowing', 'act_type_rowing');

  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
}

// ── Callback Handler (all act_ prefixes) ─────────────────────
export async function handleActivityCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;
  await ctx.answerCallbackQuery();

  const data = ctx.callbackQuery?.data || '';

  // Activity type selection
  if (data.startsWith('act_type_')) {
    const rawType = data.replace('act_type_', '');
    const type = normalizeType(rawType);
    if (!type) return;

    const user = await db.getUser(telegramUser.id);
    if (!user) return;
    await startActivityFlow(ctx, telegramUser.id, user.id, user.weight || 70, type);
    return;
  }

  // Mid-flow callback
  const session = sessions.get(telegramUser.id);
  if (!session) return;
  await processStep(ctx, telegramUser.id, data, session);
}

// ── Text Handler for ongoing conversations ───────────────────
export async function handleActivityText(ctx: Context): Promise<boolean> {
  const telegramUser = ctx.from;
  if (!telegramUser) return false;

  const session = sessions.get(telegramUser.id);
  if (!session) return false;

  const text = ctx.message?.text?.trim() || '';
  if (!text || text.startsWith('/')) return false;

  return await processStep(ctx, telegramUser.id, text, session);
}

// ── Start flow for a given type ───────────────────────────────
async function startActivityFlow(
  ctx: Context,
  telegramId: number,
  userId: string,
  weight: number,
  type: string
) {
  sessions.set(telegramId, {
    type,
    step: getFirstStep(type),
    data: {},
    userId,
    telegramId,
    weight,
  });
  await askStep(ctx, telegramId);
}

function getFirstStep(type: string): string {
  if (type === 'walk')  return 'walk_method';
  if (type === 'gym')   return 'gym_intensity';
  if (type === 'swim')  return 'swim_stroke';
  return 'duration';
}

// ── Ask current step ─────────────────────────────────────────
async function askStep(ctx: Context, telegramId: number) {
  const session = sessions.get(telegramId);
  if (!session) return;
  const { step } = session;

  if (step === 'walk_method') {
    await ctx.reply('🚶 *Walking*\n\nHow would you like to log it?', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('👣 By steps', 'act_walk_steps')
        .text('⏱ By duration', 'act_walk_dur'),
    });
    return;
  }

  if (step === 'walk_steps_count') {
    await ctx.reply('👣 How many *steps* did you walk?\n\n_e.g. 8000_', { parse_mode: 'Markdown' });
    return;
  }

  if (step === 'walk_pace') {
    await ctx.reply('🚶 What was your walking pace?', {
      reply_markup: new InlineKeyboard()
        .text('🐢 Slow (<3km/h)',  'act_walk_slow')
        .text('🚶 Normal (~5km/h)', 'act_walk_normal')
        .row()
        .text('⚡ Fast (>6km/h)', 'act_walk_fast'),
    });
    return;
  }

  if (step === 'walk_duration') {
    await ctx.reply('⏱ How many *minutes* did you walk?', { parse_mode: 'Markdown' });
    return;
  }

  if (step === 'gym_intensity') {
    await ctx.reply('🏋️ *Gym Session*\n\nWhat was the intensity of your workout?', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🪶 Light',  'act_gym_light')
        .text('💪 Moderate', 'act_gym_moderate')
        .text('🏋️ Heavy', 'act_gym_heavy'),
    });
    return;
  }

  if (step === 'gym_exercises') {
    await ctx.reply(
      `💪 What did you work on?\n\nList exercises with weight and reps:\n_e.g. Bench 80kg × 4, Squat 100kg × 3, Deadlift 120kg × 3_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (step === 'gym_duration') {
    await ctx.reply('⏱ How many *minutes* was your session?', { parse_mode: 'Markdown' });
    return;
  }

  if (step === 'swim_stroke') {
    await ctx.reply('🏊 *Swimming*\n\nWhat stroke did you swim?', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🏊 Freestyle',    'act_swim_freestyle')
        .text('🐸 Breaststroke', 'act_swim_breaststroke')
        .row()
        .text('🌊 Backstroke',  'act_swim_backstroke')
        .text('🦋 Butterfly',   'act_swim_butterfly')
        .row()
        .text('🔀 Mixed',       'act_swim_mixed'),
    });
    return;
  }

  if (step === 'swim_duration') {
    await ctx.reply('⏱ How many *minutes* did you swim?', { parse_mode: 'Markdown' });
    return;
  }

  if (step === 'duration') {
    const label = session.type.charAt(0).toUpperCase() + session.type.slice(1);
    await ctx.reply(`⏱ *${label}* — how many minutes?`, { parse_mode: 'Markdown' });
    return;
  }
}

// ── Process each step ────────────────────────────────────────
async function processStep(
  ctx: Context,
  telegramId: number,
  input: string,
  session: ActivitySession
): Promise<boolean> {
  const { step, data, type, weight, userId } = session;

  // Walk
  if (step === 'walk_method') {
    if (input === 'act_walk_steps') { session.step = 'walk_steps_count'; await askStep(ctx, telegramId); return true; }
    if (input === 'act_walk_dur')   { session.step = 'walk_pace'; await askStep(ctx, telegramId); return true; }
    return false;
  }

  if (step === 'walk_steps_count') {
    const steps = parseInt(input.replace(/[^\d]/g, ''));
    if (isNaN(steps) || steps < 100) { await ctx.reply('Please enter a valid number of steps, e.g. 8000'); return true; }
    const calories = stepsToCalories(steps, weight);
    const durationMin = Math.round((steps * 0.000762 / 5) * 60);
    await finishActivity(ctx, telegramId, session, `Walking (${steps.toLocaleString()} steps)`, durationMin, calories);
    return true;
  }

  if (step === 'walk_pace') {
    if (input.startsWith('act_walk_')) { data.pace = input.replace('act_walk_', ''); session.step = 'walk_duration'; await askStep(ctx, telegramId); return true; }
    return false;
  }

  if (step === 'walk_duration') {
    const dur = parseInt(input);
    if (isNaN(dur) || dur < 1) { await ctx.reply('Enter minutes, e.g. 45'); return true; }
    const met = MET[`walk_${data.pace || 'normal'}`] || 3.5;
    await finishActivity(ctx, telegramId, session, `Walking (${data.pace || 'normal'} pace)`, dur, metCalories(met, weight, dur));
    return true;
  }

  // Gym
  if (step === 'gym_intensity') {
    if (input.startsWith('act_gym_')) { data.intensity = input.replace('act_gym_', ''); session.step = 'gym_exercises'; await askStep(ctx, telegramId); return true; }
    return false;
  }

  if (step === 'gym_exercises') {
    data.exercises = input;
    session.step = 'gym_duration';
    await askStep(ctx, telegramId);
    return true;
  }

  if (step === 'gym_duration') {
    const dur = parseInt(input);
    if (isNaN(dur) || dur < 1) { await ctx.reply('Enter minutes, e.g. 60'); return true; }
    const met = MET[`gym_${data.intensity || 'moderate'}`] || 5.0;
    const exercises = data.exercises ? ` — ${data.exercises.substring(0, 50)}` : '';
    await finishActivity(ctx, telegramId, session, `Gym (${data.intensity}${exercises})`, dur, metCalories(met, weight, dur));
    return true;
  }

  // Swim
  if (step === 'swim_stroke') {
    if (input.startsWith('act_swim_')) { data.stroke = input.replace('act_swim_', ''); session.step = 'swim_duration'; await askStep(ctx, telegramId); return true; }
    return false;
  }

  if (step === 'swim_duration') {
    const dur = parseInt(input);
    if (isNaN(dur) || dur < 1) { await ctx.reply('Enter minutes, e.g. 30'); return true; }
    const met = MET[`swim_${data.stroke || 'mixed'}`] || 7.0;
    await finishActivity(ctx, telegramId, session, `Swimming (${data.stroke})`, dur, metCalories(met, weight, dur));
    return true;
  }

  // Generic duration
  if (step === 'duration') {
    const dur = parseInt(input);
    if (isNaN(dur) || dur < 1) { await ctx.reply('Enter minutes, e.g. 30'); return true; }
    const met = MET[type] || 5.0;
    const label = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
    await finishActivity(ctx, telegramId, session, label, dur, metCalories(met, weight, dur));
    return true;
  }

  return false;
}

// ── Finish & Save ─────────────────────────────────────────────
async function finishActivity(
  ctx: Context,
  telegramId: number,
  session: ActivitySession,
  label: string,
  durationMin: number,
  calories: number
) {
  const { userId } = session;
  await db.logActivity(userId, label, durationMin, calories);
  sessions.delete(telegramId);

  const { totalBurned } = await db.getActivityForDate(userId, new Date());
  const today = new Date().toISOString().split('T')[0];
  const summary = await db.getDailySummary(userId, today);
  const eaten = Math.round(summary?.totalCalories || 0);
  const net = eaten - totalBurned;

  let msg = `✅ *Activity Logged!*\n\n`;
  msg += `🏃 ${label}\n`;
  if (durationMin > 0) msg += `⏱ Duration: ${durationMin} min\n`;
  msg += `🔥 Burned: *${calories} kcal*\n\n`;
  msg += `*Today's Balance:*\n`;
  msg += `  Eaten:   ${eaten} kcal\n`;
  msg += `  Burned:  ${totalBurned} kcal\n`;
  msg += `  Net:     *${net} kcal*`;

  const user = await db.getUser(telegramId);
  if (user?.dailyCalorieGoal) {
    const remaining = (user.dailyCalorieGoal + totalBurned) - eaten;
    if (remaining > 0) {
      msg += `\n\n✅ You can eat *${Math.round(remaining)} more kcal* today!`;
    } else {
      msg += `\n\n⚠️ Over adjusted calorie goal.`;
    }
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

// ── Normalize type ─────────────────────────────────────────────
function normalizeType(input: string): string | null {
  const map: Record<string, string> = {
    walk: 'walk', walking: 'walk',
    run: 'run', running: 'run', jog: 'run', jogging: 'run',
    gym: 'gym', weights: 'gym', lift: 'gym', lifting: 'gym',
    swim: 'swim', swimming: 'swim',
    bike: 'bike', cycling: 'bike', cycle: 'bike',
    hiit: 'hiit',
    yoga: 'yoga',
    pilates: 'pilates',
    dance: 'dance', dancing: 'dance',
    football: 'football', soccer: 'football',
    basketball: 'basketball',
    tennis: 'tennis',
    hike: 'hike', hiking: 'hike',
    crossfit: 'crossfit',
    row: 'rowing', rowing: 'rowing',
    elliptical: 'elliptical',
    jump: 'jump_rope',
  };
  return map[input] || null;
}
