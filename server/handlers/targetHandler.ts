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

  if (!targetWeight || isNaN(targetWeight) || targetWeight < 20 || targetWeight > 500) {
    if (user.targetWeight) {
        await ctx.reply(`🎯 Your current target weight is *${user.targetWeight}kg*.\n\nTo change it, use: \`/target 75\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.reply(`🎯 *Set Target Weight*\n\nUsage: \`/target 75\``, { parse_mode: 'Markdown' });
    }
    return;
  }

  await db.updateUserGoals(telegramUser.id, { targetWeight });

  await ctx.reply(`🎯 Target weight set to *${targetWeight}kg*!`, { parse_mode: 'Markdown' });
}
