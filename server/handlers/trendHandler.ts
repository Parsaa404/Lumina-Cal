import { Context } from 'grammy';
import { db } from '../services/db';

export async function handleTrend(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const logs = await db.getWeightHistory(user.id);

  if (logs.length < 2) {
    await ctx.reply(
      `📊 *Weight Trend*\n\nNot enough data yet. Log your weight at least twice with /weight to see your trend.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // ── ASCII Chart ────────────────────────────────────────────
  const weights = logs.map(l => l.weight);
  const minW = Math.floor(Math.min(...weights)) - 1;
  const maxW = Math.ceil(Math.max(...weights)) + 1;
  const chartHeight = 6;
  const chartWidth = Math.min(logs.length, 12);

  // Use last chartWidth entries
  const recent = logs.slice(-chartWidth);

  let chart = `📊 *Weight Trend* (last ${recent.length} logs)\n\n`;
  chart += `\`\`\`\n`;

  // Build grid row by row from top (maxW) to bottom (minW)
  for (let row = chartHeight; row >= 0; row--) {
    const rowWeight = minW + ((maxW - minW) * row) / chartHeight;
    const label = rowWeight.toFixed(1).padStart(5);
    let line = `${label} │`;

    for (const log of recent) {
      const logRow = ((log.weight - minW) / (maxW - minW)) * chartHeight;
      const diff = Math.abs(logRow - row);
      if (diff < 0.6) line += '●';
      else if (diff < 1.2) line += '·';
      else line += ' ';
    }
    chart += line + '\n';
  }

  chart += `      └${'─'.repeat(recent.length)}\n`;
  chart += `\`\`\`\n`;

  // ── Stats ─────────────────────────────────────────────────
  const first = logs[0];
  const last  = logs[logs.length - 1];
  const totalChange = parseFloat((last.weight - first.weight).toFixed(1));
  const avgChange = parseFloat((totalChange / (logs.length - 1)).toFixed(2));

  chart += `Current: *${last.weight}kg*  |  `;
  chart += `Total: *${totalChange > 0 ? '+' : ''}${totalChange}kg*\n`;
  chart += `Avg per log: *${avgChange > 0 ? '+' : ''}${avgChange}kg*\n`;

  // ── ETA to Target ─────────────────────────────────────────
  if (user.targetWeight && avgChange !== 0) {
    const remaining = user.targetWeight - last.weight;
    const logsNeeded = Math.abs(remaining / avgChange);
    const weeksNeeded = Math.ceil(logsNeeded); // assuming weekly logs

    const etaDate = new Date();
    etaDate.setDate(etaDate.getDate() + weeksNeeded * 7);
    const etaStr = etaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const onTrack = (user.fitnessGoal === 'weight_loss' && avgChange < 0) ||
                    (user.fitnessGoal === 'muscle_building' && avgChange > 0) ||
                    avgChange !== 0;

    if (onTrack) {
      chart += `\n🎯 Target: *${user.targetWeight}kg*\n`;
      chart += `📅 Est. arrival: *${etaStr}* (~${weeksNeeded}w)\n`;
      chart += `_At your current pace of ${avgChange > 0 ? '+' : ''}${avgChange}kg/week_`;
    } else {
      chart += `\n⚠️ Target: *${user.targetWeight}kg* — not moving toward goal yet.`;
    }
  } else if (user.targetWeight) {
    chart += `\n🎯 Target: *${user.targetWeight}kg* — set with /target`;
  } else {
    chart += `\n_Set a target with /target 70 to see ETA_`;
  }

  await ctx.reply(chart, { parse_mode: 'Markdown' });
}
