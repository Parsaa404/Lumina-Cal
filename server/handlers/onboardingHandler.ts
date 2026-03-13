import { Context } from 'grammy';
import { db } from '../services/db';
import {
  getOnboarding,
  updateOnboarding,
  clearOnboarding,
} from './onboardingState';
import { generateNutritionPlan, getFallbackNutritionPlan } from '../services/nutrition/aiRecommendations';

// ─── Helpers ──────────────────────────────────────────────────

function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return parseFloat((weightKg / (h * h)).toFixed(1));
}

function calculatePBF(bmi: number, age: number, gender: 'male' | 'female'): number {
  const gf = gender === 'male' ? 1 : 0;
  return parseFloat(((1.2 * bmi) + (0.23 * age) - (10.8 * gf) - 5.4).toFixed(1));
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function parseDateOfBirth(input: string): Date | null {
  const t = input.trim();
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d.getTime())) return d;
  }
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getBMICategory(bmi: number): { label: string; emoji: string } {
  if (bmi < 18.5) return { label: 'Underweight', emoji: '🔵' };
  if (bmi < 25)   return { label: 'Normal',      emoji: '🟢' };
  if (bmi < 30)   return { label: 'Overweight',  emoji: '🟡' };
  return             { label: 'Obese',         emoji: '🔴' };
}

function getPBFCategory(pbf: number, gender: 'male' | 'female'): { label: string; emoji: string } {
  if (gender === 'male') {
    if (pbf < 6)  return { label: 'Essential Fat', emoji: '⚠️' };
    if (pbf < 14) return { label: 'Athletic',      emoji: '💪' };
    if (pbf < 18) return { label: 'Fit',           emoji: '🟢' };
    if (pbf < 25) return { label: 'Average',       emoji: '🟡' };
    return               { label: 'Above Average', emoji: '🔴' };
  } else {
    if (pbf < 14) return { label: 'Essential Fat', emoji: '⚠️' };
    if (pbf < 21) return { label: 'Athletic',      emoji: '💪' };
    if (pbf < 25) return { label: 'Fit',           emoji: '🟢' };
    if (pbf < 32) return { label: 'Average',       emoji: '🟡' };
    return               { label: 'Above Average', emoji: '🔴' };
  }
}

const GOAL_LABELS: Record<string, string> = {
  muscle_building:   '💪 Muscle Gain',
  weight_loss:       '🔥 Fat Loss',
  maintain:          '⚖️ Maintain Weight',
  recomposition:     '💪 Recomposition',
  healthy_lifestyle: '🥗 Healthy Lifestyle',
};

// ─── Prompt Senders ───────────────────────────────────────────

export function sendGenderPrompt(ctx: Context) {
  return ctx.reply(
    '👋 Welcome! Let\'s set up your profile.\n\n🧬 Select your gender:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🙋‍♂️ Male',   callback_data: 'onboard_gender_male' },
          { text: '🙋‍♀️ Female', callback_data: 'onboard_gender_female' },
        ]],
      },
    }
  );
}

function sendHeightPrompt(ctx: Context) {
  return ctx.reply('📏 What\'s your height in cm?\n\n_Example: 175_', { parse_mode: 'Markdown' });
}
function sendWeightPrompt(ctx: Context) {
  return ctx.reply('⚖️ What\'s your weight in kg?\n\n_Example: 72_', { parse_mode: 'Markdown' });
}
function sendDOBPrompt(ctx: Context) {
  return ctx.reply('🎂 What\'s your date of birth?\n\n_Format: DD/MM/YYYY — e.g. 15/06/1998_', { parse_mode: 'Markdown' });
}

function sendGoalPrompt(ctx: Context) {
  return ctx.reply(
    '🎯 What\'s your fitness goal?',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💪 Muscle Gain',      callback_data: 'onboard_goal_muscle_building' },
           { text: '🔥 Fat Loss',         callback_data: 'onboard_goal_weight_loss' }],
          [{ text: '⚖️ Maintain Weight',  callback_data: 'onboard_goal_maintain' },
           { text: '💪 Recomposition',    callback_data: 'onboard_goal_recomposition' }],
          [{ text: '🥗 Healthy Lifestyle',callback_data: 'onboard_goal_healthy_lifestyle' }],
        ],
      },
    }
  );
}

function sendActivityPrompt(ctx: Context) {
  return ctx.reply(
    '🏃 What\'s your activity level?\n\n_Used to calculate your precise daily calorie needs._',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💻 Sedentary (desk job, no exercise)', callback_data: 'onboard_activity_sedentary' }],
          [{ text: '🚶 Light (1-3 days/week)',              callback_data: 'onboard_activity_light' }],
          [{ text: '🚴 Moderate (3-5 days/week)',           callback_data: 'onboard_activity_moderate' }],
          [{ text: '🏋️ Active (6-7 days hard exercise)',    callback_data: 'onboard_activity_active' }],
          [{ text: '🏅 Athlete (2x/day or physical job)',   callback_data: 'onboard_activity_athlete' }],
        ],
      },
    }
  );
}

// ─── Callback Handler ─────────────────────────────────────────

export async function handleOnboardingCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;
  const data = ctx.callbackQuery?.data;
  if (!data) return;
  // Continue (Does not require active onboarding state because state was cleared in previous step)
  if (data === 'onboard_continue') {
    clearOnboarding(telegramUser.id);
    await ctx.answerCallbackQuery();
    try { await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); } catch { /* ignore */ }
    const { showWelcomeMessage } = await import('./startHandler');
    await showWelcomeMessage(ctx, telegramUser);
    return;
  }

  const onboarding = getOnboarding(telegramUser.id);
  if (!onboarding) return;

  // Gender
  if (data === 'onboard_gender_male' || data === 'onboard_gender_female') {
    if (onboarding.step !== 'gender') return;
    const gender = data === 'onboard_gender_male' ? 'male' : 'female';
    updateOnboarding(telegramUser.id, { gender, step: 'height' });
    await ctx.answerCallbackQuery({ text: gender === 'male' ? '🙋‍♂️ Male selected' : '🙋‍♀️ Female selected' });
    try { await ctx.editMessageText(`🧬 Gender: ${gender === 'male' ? '🙋‍♂️ Male' : '🙋‍♀️ Female'} ✅`); } catch { /* ignore */ }
    await sendHeightPrompt(ctx);
    return;
  }

  // Goal
  if (data.startsWith('onboard_goal_')) {
    if (onboarding.step !== 'goal') return;
    const goal      = data.replace('onboard_goal_', '');
    const goalLabel = GOAL_LABELS[goal] || goal;
    updateOnboarding(telegramUser.id, { fitnessGoal: goal, step: 'activity' });
    await ctx.answerCallbackQuery({ text: `${goalLabel} selected` });
    try { await ctx.editMessageText(`🎯 Goal: ${goalLabel} ✅`); } catch { /* ignore */ }
    await sendActivityPrompt(ctx);
    return;
  }

  // Activity level
  if (data.startsWith('onboard_activity_')) {
    if (onboarding.step !== 'activity') return;
    const activityLevel = data.replace('onboard_activity_', '');
    const actLabels: Record<string, string> = {
      sedentary: '💻 Sedentary', light: '🚶 Light', moderate: '🚴 Moderate',
      active: '🏋️ Active',      athlete: '🏅 Athlete',
    };
    const actLabel = actLabels[activityLevel] || activityLevel;
    updateOnboarding(telegramUser.id, { activityLevel, step: 'done' });
    await ctx.answerCallbackQuery({ text: `${actLabel} selected` });
    try { await ctx.editMessageText(`🏃 Activity: ${actLabel} ✅`); } catch { /* ignore */ }

    const fd = getOnboarding(telegramUser.id)!;
    const { gender, height, weight, age, fitnessGoal: goal } = fd as any;

    const bmi    = calculateBMI(weight, height);
    const pbf    = calculatePBF(bmi, age, gender);
    const bmiCat = getBMICategory(bmi);
    const pbfCat = getPBFCategory(pbf, gender);

    const loadingMsg = await ctx.reply('🤖 Generating your personalized nutrition plan...');
    const profile = { gender, height, weight, age, bmi, pbf, fitnessGoal: goal, activityLevel };
    let plan = await generateNutritionPlan(profile);
    if (!plan) plan = getFallbackNutritionPlan(profile);

    const user = await db.getUser(telegramUser.id);
    if (user) {
      await db.updateUserProfile(telegramUser.id, { gender, height, weight, age, bmi, pbf, fitnessGoal: goal });
      await db.updateUserGoals(telegramUser.id, {
        dailyCalorieGoal: plan.dailyCalories, dailyProteinGoal: plan.dailyProtein,
        dailyCarbsGoal: plan.dailyCarbs,      dailyFatsGoal:    plan.dailyFats,
      });
    }
    clearOnboarding(telegramUser.id);

    try { await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id); } catch { /* ignore */ }
    const goalLabel = GOAL_LABELS[goal] || goal;
    let msg = `📊 *Your Body Profile*\n\n`;
    msg += `┌─────────────────────\n`;
    msg += `│ ${bmiCat.emoji} *BMI:* ${bmi} — _${bmiCat.label}_\n`;
    msg += `│ ${pbfCat.emoji} *Body Fat:* ${pbf}% — _${pbfCat.label}_\n`;
    msg += `│ 🎯 *Goal:* ${goalLabel}\n`;
    msg += `│ 🏃 *Activity:* ${actLabel}\n`;
    msg += `├─────────────────────\n`;
    msg += `│ 🔥 *Daily Calories:* ${plan.dailyCalories} kcal\n`;
    msg += `│ Protein:        ${plan.dailyProtein} g\n`;
    msg += `│ Carbs:          ${plan.dailyCarbs} g\n`;
    msg += `│ Fats:           ${plan.dailyFats} g\n`;
    msg += `└─────────────────────\n`;
    msg += `\n💡 _${plan.tip}_`;
    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Start Tracking ➡️', callback_data: 'onboard_continue' }]] },
    });
    return;
  }


}

// ─── Text Handler for Onboarding Steps ───────────────────────

export async function handleOnboardingText(ctx: Context): Promise<boolean> {
  const telegramUser = ctx.from;
  if (!telegramUser) return false;
  const onboarding = getOnboarding(telegramUser.id);
  if (!onboarding || onboarding.step === 'done' || onboarding.step === 'gender' || onboarding.step === 'goal' || onboarding.step === 'activity') return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  switch (onboarding.step) {
    case 'height': {
      const v = parseFloat(text);
      if (isNaN(v) || v < 50 || v > 300) { await ctx.reply('❌ Please enter a valid number between 50 and 300 cm.'); return true; }
      updateOnboarding(telegramUser.id, { height: v, step: 'weight' });
      await sendWeightPrompt(ctx);
      return true;
    }
    case 'weight': {
      const v = parseFloat(text);
      if (isNaN(v) || v < 20 || v > 500) { await ctx.reply('❌ Please enter a valid number between 20 and 500 kg.'); return true; }
      updateOnboarding(telegramUser.id, { weight: v, step: 'age' });
      await sendDOBPrompt(ctx);
      return true;
    }
    case 'age': {
      const dob = parseDateOfBirth(text);
      if (!dob) { await ctx.reply('❌ Invalid date format. Please use DD/MM/YYYY (e.g. 15/06/1998).'); return true; }
      const age = calculateAge(dob);
      if (age < 5 || age > 120) { await ctx.reply('❌ Please enter a valid date of birth.'); return true; }
      updateOnboarding(telegramUser.id, { age, step: 'goal' });
      await sendGoalPrompt(ctx);
      return true;
    }
    default: return false;
  }
}
