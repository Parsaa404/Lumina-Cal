import { Context } from 'grammy';
import { db } from '../services/db';
import { getGenAI } from '../services/nutrition/visionFallback';

// ── In-memory fast session store ──────────────────────────────
interface FastSession { startTime: Date; }
const fastSessions = new Map<number, FastSession>();

// ── /fast ─────────────────────────────────────────────────────
export async function handleFast(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const text = ctx.message?.text || '';
  const arg = text.trim().split(/\s+/)[1]?.toLowerCase();
  const existing = fastSessions.get(telegramUser.id);

  if (!arg) {
    if (existing) {
      const elapsed = Date.now() - existing.startTime.getTime();
      const hours = Math.floor(elapsed / 3600000);
      const mins  = Math.floor((elapsed % 3600000) / 60000);
      await ctx.reply(
        `⏱ *Fast in progress*\n\nStarted: ${existing.startTime.toLocaleTimeString()}\nDuration: *${hours}h ${mins}m*\n\nCommands: \`/fast stop\``,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `⏸ *Fasting Tracker*\n\nNo active fast.\n\nStart one with: \`/fast start\``,
        { parse_mode: 'Markdown' }
      );
    }
    return;
  }

  if (arg === 'start') {
    fastSessions.set(telegramUser.id, { startTime: new Date() });
    await ctx.reply(
      `✅ *Fasting started!*\n\n🕐 Start time: ${new Date().toLocaleTimeString()}\n\nI'll track your fast. Use \`/fast stop\` when you break it.\n\n_Common targets: 12h · 16h · 18h · 24h_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (arg === 'stop') {
    if (!existing) {
      await ctx.reply('No active fast to stop. Start one with `/fast start`', { parse_mode: 'Markdown' });
      return;
    }
    const elapsed = Date.now() - existing.startTime.getTime();
    const hours   = Math.floor(elapsed / 3600000);
    const mins    = Math.floor((elapsed % 3600000) / 60000);
    fastSessions.delete(telegramUser.id);

    let trophy = '';
    if (hours >= 24) trophy = '🏅 Full Day Fast!';
    else if (hours >= 18) trophy = '🔥 Extended Fast!';
    else if (hours >= 16) trophy = '⚡ 16:8 Complete!';
    else if (hours >= 12) trophy = '✅ 12-Hour Fast!';

    let msg = `🎉 *Fast Complete!*\n\n`;
    msg += `⏱ Duration: *${hours}h ${mins}m*\n`;
    if (trophy) msg += `${trophy}\n`;
    msg += `\n_Estimated fat burned: ~${Math.round(hours * 50)} kcal_\n`;
    msg += `_Remember to break your fast gently — start with light foods._`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  await ctx.reply('Usage: `/fast start` or `/fast stop`', { parse_mode: 'Markdown' });
}
