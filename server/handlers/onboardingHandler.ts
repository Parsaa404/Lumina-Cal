import { Context } from 'grammy';
import { db } from '../services/db';
import {
  getOnboarding,
  updateOnboarding,
  clearOnboarding,
} from './onboardingState';
import { generateNutritionPlan, getFallbackNutritionPlan } from '../services/nutrition/aiRecommendations';

// ─── BMI & PBF Calculations ───────────────────────────────────

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * Percent Body Fat using the Deurenberg formula:
 * PBF = (1.20 × BMI) + (0.23 × age) − (10.8 × genderFactor) − 5.4
 * genderFactor: 1 = male, 0 = female
 */
function calculatePBF(bmi: number, age: number, gender: 'male' | 'female'): number {
  const genderFactor = gender === 'male' ? 1 : 0;
  return parseFloat(((1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4).toFixed(1));
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function parseDateOfBirth(input: string): Date | null {
  const trimmed = input.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  let match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(date.getTime())) return date;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

function getBMICategory(bmi: number): { label: string; emoji: string } {
  if (bmi < 18.5) return { label: 'Underweight', emoji: '🔵' };
  if (bmi < 25) return { label: 'Normal', emoji: '🟢' };
  if (bmi < 30) return { label: 'Overweight', emoji: '🟡' };
  return { label: 'Obese', emoji: '🔴' };
}

function getPBFCategory(pbf: number, gender: 'male' | 'female'): { label: string; emoji: string } {
  if (gender === 'male') {
    if (pbf < 6) return { label: 'Essential Fat', emoji: '⚠️' };
    if (pbf < 14) return { label: 'Athletic', emoji: '💪' };
    if (pbf < 18) return { label: 'Fit', emoji: '🟢' };
    if (pbf < 25) return { label: 'Average', emoji: '🟡' };
    return { label: 'Above Average', emoji: '🔴' };
  } else {
    if (pbf < 14) return { label: 'Essential Fat', emoji: '⚠️' };
    if (pbf < 21) return { label: 'Athletic', emoji: '💪' };
    if (pbf < 25) return { label: 'Fit', emoji: '🟢' };
    if (pbf < 32) return { label: 'Average', emoji: '🟡' };
    return { label: 'Above Average', emoji: '🔴' };
  }
}

const GOAL_LABELS: Record<string, string> = {
  muscle_building: '💪 Muscle Gain',
  weight_loss: '🔥 Fat Loss',
  maintain: '⚖️ Maintain Weight',
  recomposition: '💪 Recomposition',
  healthy_lifestyle: '🥗 Healthy Lifestyle',
};

// ─── Prompt Helpers ───────────────────────────────────────────

export function sendGenderPrompt(ctx: Context) {
  return ctx.reply(
    '👋 Welcome! Let\'s set up your profile.\n\n' +
    '🧬 Select your gender:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🙋‍♂️ Male', callback_data: 'onboard_gender_male' },
            { text: '🙋‍♀️ Female', callback_data: 'onboard_gender_female' },
          ],
        ],
      },
    }
  );
}

function sendHeightPrompt(ctx: Context) {
  return ctx.reply('📏 What\'s your height in cm?\n\n_Example: 175_', {
    parse_mode: 'Markdown',
  });
}

function sendWeightPrompt(ctx: Context) {
  return ctx.reply('⚖️ What\'s your weight in kg?\n\n_Example: 72_', {
    parse_mode: 'Markdown',
  });
}

function sendDOBPrompt(ctx: Context) {
  return ctx.reply('🎂 What\'s your date of birth?\n\n_Format: DD/MM/YYYY (e.g. 15/06/1998)_', {
    parse_mode: 'Markdown',
  });
}

function sendGoalPrompt(ctx: Context) {
  return ctx.reply(
    '🎯 What\'s your fitness goal?',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💪 Muscle Gain', callback_data: 'onboard_goal_muscle_building' },
            { text: '🔥 Fat Loss', callback_data: 'onboard_goal_weight_loss' },
          ],
          [
            { text: '⚖️ Maintain Weight', callback_data: 'onboard_goal_maintain' },
            { text: '💪 Recomposition', callback_data: 'onboard_goal_recomposition' },
          ],
          [
            { text: '🥗 Healthy Lifestyle', callback_data: 'onboard_goal_healthy_lifestyle' },
          ],
        ],
      },
    }
  );
}

// ─── Callback Query Handler (button clicks) ──────────────────

export async function handleOnboardingCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const onboarding = getOnboarding(telegramUser.id);
  if (!onboarding) return;

  // Gender selection
  if (data === 'onboard_gender_male' || data === 'onboard_gender_female') {
    if (onboarding.step !== 'gender') return;

    const gender = data === 'onboard_gender_male' ? 'male' : 'female';
    updateOnboarding(telegramUser.id, { gender, step: 'height' });

    await ctx.answerCallbackQuery({
      text: gender === 'male' ? '🙋‍♂️ Male selected' : '🙋‍♀️ Female selected',
    });

    try {
      await ctx.editMessageText(
        `🧬 Gender: ${gender === 'male' ? '🙋‍♂️ Male' : '🙋‍♀️ Female'} ✅`
      );
    } catch { /* ignore edit errors */ }

    await sendHeightPrompt(ctx);
    return;
  }

  // Fitness goal selection
  if (data.startsWith('onboard_goal_')) {
    if (onboarding.step !== 'goal') return;

    const goal = data.replace('onboard_goal_', '');
    const goalLabel = GOAL_LABELS[goal] || goal;
    updateOnboarding(telegramUser.id, { fitnessGoal: goal, step: 'done' });

    await ctx.answerCallbackQuery({ text: `${goalLabel} selected` });

    try {
      await ctx.editMessageText(`🎯 Goal: ${goalLabel} ✅`);
    } catch { /* ignore */ }

    // Now we have ALL data — calculate BMI/PBF and get AI recommendations
    const finalData = getOnboarding(telegramUser.id)!;
    const { gender, height, weight, age } = finalData as Required<typeof finalData>;

    const bmi = calculateBMI(weight, height);
    const pbf = calculatePBF(bmi, age, gender);
    const bmiCat = getBMICategory(bmi);
    const pbfCat = getPBFCategory(pbf, gender);

    // Show "generating..." message
    const loadingMsg = await ctx.reply('🤖 Generating your personalized nutrition plan...');

    // Get AI-powered nutrition plan
    const profile = { gender, height, weight, age, bmi, pbf, fitnessGoal: goal };
    let plan = await generateNutritionPlan(profile);
    if (!plan) {
      plan = getFallbackNutritionPlan(profile);
    }

    // Save everything to database
    const user = await db.getUser(telegramUser.id);
    if (user) {
      await db.updateUserProfile(telegramUser.id, {
        gender,
        height,
        weight,
        age,
        bmi,
        pbf,
        fitnessGoal: goal,
      });
      // Update daily goals with AI recommendations
      await db.updateUserGoals(telegramUser.id, {
        dailyCalorieGoal: plan.dailyCalories,
        dailyProteinGoal: plan.dailyProtein,
        dailyCarbsGoal: plan.dailyCarbs,
        dailyFatsGoal: plan.dailyFats,
      });
    }

    // Delete loading message
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
    } catch { /* ignore */ }

    // Build results message
    const heightM = (height / 100).toFixed(2);
    let msg = `📊 *Your Body Profile*\n\n`;
    msg += `┌─────────────────────\n`;
    msg += `│ 🧬 Gender: ${gender === 'male' ? 'Male' : 'Female'}\n`;
    msg += `│ 📏 Height: ${height} cm (${heightM} m)\n`;
    msg += `│ ⚖️ Weight: ${weight} kg\n`;
    msg += `│ 🎂 Age: ${age} years\n`;
    msg += `│ 🎯 Goal: ${goalLabel}\n`;
    msg += `├─────────────────────\n`;
    msg += `│ ${bmiCat.emoji} *BMI:* ${bmi} — _${bmiCat.label}_\n`;
    msg += `│ ${pbfCat.emoji} *Body Fat:* ${pbf}% — _${pbfCat.label}_\n`;
    msg += `├─────────────────────\n`;
    msg += `│ 🔥 *Daily Calories:* ${plan.dailyCalories} kcal\n`;
    msg += `│ 🥩 *Protein:* ${plan.dailyProtein}g\n`;
    msg += `│ 🍞 *Carbs:* ${plan.dailyCarbs}g\n`;
    msg += `│ 🥑 *Fats:* ${plan.dailyFats}g\n`;
    msg += `└─────────────────────\n`;
    msg += `\n💡 _${plan.tip}_`;

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Continue ➡️', callback_data: 'onboard_continue' }],
        ],
      },
    });

    return;
  }

  // "Continue" button after results
  if (data === 'onboard_continue') {
    clearOnboarding(telegramUser.id);
    await ctx.answerCallbackQuery();

    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore */ }

    const { showWelcomeMessage } = await import('./startHandler');
    await showWelcomeMessage(ctx, telegramUser);
    return;
  }
}

// ─── Text Handler for Onboarding Steps ──────────────────────

export async function handleOnboardingText(ctx: Context): Promise<boolean> {
  const telegramUser = ctx.from;
  if (!telegramUser) return false;

  const onboarding = getOnboarding(telegramUser.id);
  if (!onboarding || onboarding.step === 'done' || onboarding.step === 'gender' || onboarding.step === 'goal') {
    return false;
  }

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  switch (onboarding.step) {
    case 'height': {
      const value = parseFloat(text);
      if (isNaN(value) || value < 50 || value > 300) {
        await ctx.reply('❌ Please enter a valid number between 50 and 300 cm.');
        return true;
      }
      updateOnboarding(telegramUser.id, { height: value, step: 'weight' });
      await sendWeightPrompt(ctx);
      return true;
    }

    case 'weight': {
      const value = parseFloat(text);
      if (isNaN(value) || value < 20 || value > 500) {
        await ctx.reply('❌ Please enter a valid number between 20 and 500 kg.');
        return true;
      }
      updateOnboarding(telegramUser.id, { weight: value, step: 'age' });
      await sendDOBPrompt(ctx);
      return true;
    }

    case 'age': {
      const dob = parseDateOfBirth(text);
      if (!dob) {
        await ctx.reply('❌ Invalid date format. Please use DD/MM/YYYY (e.g. 15/06/1998).');
        return true;
      }

      const age = calculateAge(dob);
      if (age < 5 || age > 120) {
        await ctx.reply('❌ Please enter a valid date of birth (age must be between 5 and 120).');
        return true;
      }

      updateOnboarding(telegramUser.id, { age, step: 'goal' });

      // Now ask for fitness goal
      await sendGoalPrompt(ctx);
      return true;
    }
  }

  return false;
}
