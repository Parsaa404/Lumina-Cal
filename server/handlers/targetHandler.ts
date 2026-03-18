import { Context } from 'grammy';
import { db } from '../services/db';

export async function handleTarget(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);
  const targetWeight = parts[1] ? parseFloat(parts[1]) : null;

  // No argument — show current target
  if (!targetWeight || isNaN(targetWeight) || targetWeight < 20 || targetWeight > 500) {
    if (user.targetWeight) {
      await ctx.reply(
        `🎯 Current target: *${user.targetWeight}kg*\n\nChange it with: \`/target 75\``,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(`🎯 *Set a target weight*\n\nUsage: \`/target 75\``, { parse_mode: 'Markdown' });
    }
    return;
  }

  const saved = await db.updateUserGoals(telegramUser.id, { targetWeight });

  if (saved) {
    await ctx.reply(`🎯 Target weight set to *${targetWeight}kg*!\n\nWhen you reach this weight, I'll notify you automatically. Keep tracking with \`/weight\``, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Failed to save target weight. Please try again.`);
  }
}
