import { Context } from 'grammy';
import { db } from '../services/db';
import { addWater, getWaterToday } from '../services/hydrationStore';

const DAILY_GOAL_ML = 2500; // 2.5L default

export async function handleWater(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Show current status + quick-add buttons
  const current = getWaterToday(telegramUser.id);
  await sendWaterStatus(ctx, telegramUser.id, current);
}

export async function handleWaterCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('water_add_')) return;

  const ml = parseInt(data.replace('water_add_', ''));
  if (isNaN(ml)) return;

  const newTotal = addWater(telegramUser.id, ml);
  await ctx.answerCallbackQuery({ text: `+${ml}ml logged! 💧` });

  const percent = Math.round((newTotal / DAILY_GOAL_ML) * 100);
  const isGoal = newTotal >= DAILY_GOAL_ML;

  let msg = isGoal
    ? `💧 *Water Goal Reached!* 🎉\n${formatWaterBar(newTotal, DAILY_GOAL_ML)}\n${newTotal}ml / ${DAILY_GOAL_ML}ml (${percent}%)`
    : `💧 *Hydration Update*\n${formatWaterBar(newTotal, DAILY_GOAL_ML)}\n${newTotal}ml / ${DAILY_GOAL_ML}ml (${percent}%)`;

  try {
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: buildWaterKeyboard(),
    });
  } catch { /* ignore */ }
}

async function sendWaterStatus(ctx: Context, telegramId: number, currentMl: number) {
  const percent = Math.round((currentMl / DAILY_GOAL_ML) * 100);
  const remaining = Math.max(0, DAILY_GOAL_ML - currentMl);

  let msg = `💧 *Hydration Tracker*\n\n`;
  msg += formatWaterBar(currentMl, DAILY_GOAL_ML) + '\n';
  msg += `Today: *${currentMl}ml* / ${DAILY_GOAL_ML}ml (${percent}%)\n`;

  if (remaining > 0) {
    msg += `Remaining: *${remaining}ml* (${Math.ceil(remaining / 250)} more glasses)\n`;
    if (currentMl === 0) {
      msg += `\n⚠️ You haven't logged any water today. Stay hydrated!`;
    }
  } else {
    msg += `\n✅ Daily goal reached! Great hydration!`;
  }

  msg += `\n\n👇 *Quick add:*`;

  await ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: buildWaterKeyboard(),
  });
}

function buildWaterKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '💧 250ml', callback_data: 'water_add_250' },
        { text: '💧 500ml', callback_data: 'water_add_500' },
        { text: '💧 750ml', callback_data: 'water_add_750' },
      ],
      [
        { text: '🥤 1L', callback_data: 'water_add_1000' },
        { text: '🫗 1.5L', callback_data: 'water_add_1500' },
      ],
    ],
  };
}

function formatWaterBar(current: number, goal: number): string {
  const blocks = 10;
  const filled = Math.min(Math.round((current / goal) * blocks), blocks);
  const bar = '█'.repeat(filled) + '░'.repeat(blocks - filled);
  return `[${bar}]`;
}
