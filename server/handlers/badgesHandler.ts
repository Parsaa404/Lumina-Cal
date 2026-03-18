import { Context } from 'grammy';
import { db } from '../services/db';
import { computeEarnedBadges, formatBadges } from '../services/badges';

export async function handleBadges(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const badges = await computeEarnedBadges(user);

  let msg = `🏆 *Your Achievements* (${badges.length} earned)\n\n`;
  msg += formatBadges(badges);
  msg += `\n_Keep tracking to unlock more!_`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
