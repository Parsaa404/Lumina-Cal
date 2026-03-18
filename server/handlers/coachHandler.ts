import { Context } from 'grammy';
import { db } from '../services/db';
import { getGenAI } from '../services/nutrition/visionFallback';

export async function handleCoach(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply('🤖 Analyzing your week...');

  try {
    // Gather last 7 days of data
    const days: string[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(now - i * 86400000).toISOString().split('T')[0]);
    }

    const summaries = await Promise.all(
      days.map(async (day) => {
        const s = await db.getDailySummary(user.id, day);
        return { day, calories: s?.totalCalories || 0, protein: s?.totalProtein || 0,
          water: s?.waterAmount || 0, meals: s?.meals?.length || 0 };
      })
    );

    const weightHistory = await db.getWeightHistory(user.id);

    // Build context for Gemini
    const weekSummary = summaries.map(s =>
      `${s.day}: ${Math.round(s.calories)} kcal, ${Math.round(s.protein)}g protein, ${s.meals} meals, water: ${s.water}ml`
    ).join('\n');

    const currentWeight = weightHistory.length > 0
      ? weightHistory[weightHistory.length - 1].weight : user.weight;
    const weightTrend = weightHistory.length >= 2
      ? `Weight trend: ${weightHistory[0].weight}kg → ${currentWeight}kg over ${weightHistory.length} logs`
      : `Current weight: ${currentWeight}kg`;

    const prompt = `You are an expert nutrition coach. Analyze this user's last 7 days:

User profile:
- Goal: ${user.fitnessGoal || 'healthy lifestyle'}
- Daily calorie target: ${user.dailyCalorieGoal || 2000} kcal
- Daily protein target: ${user.dailyProteinGoal || 150}g
- ${weightTrend}

Last 7 days:
${weekSummary}

Provide a CONCISE personalized coaching analysis (max 250 words):
1. What they're doing well (1-2 things)
2. Biggest issue this week (1 thing, be specific)
3. One actionable tip for next week
4. A motivating closing line

Use plain text, no markdown lists, conversational tone.`;

    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const analysis = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis';

    // Build stats header
    const avgCal  = Math.round(summaries.reduce((s, d) => s + d.calories, 0) / 7);
    const avgProt = Math.round(summaries.reduce((s, d) => s + d.protein, 0) / 7);
    const loggedDays = summaries.filter(d => d.meals > 0).length;

    let msg = `🤖 *Your Weekly AI Coach Report*\n\n`;
    msg += `📊 *7-Day Stats:*\n`;
    msg += `  Avg calories: ${avgCal} kcal/day\n`;
    msg += `  Avg protein:  ${avgProt}g/day\n`;
    msg += `  Days logged:  ${loggedDays}/7\n`;
    msg += `  Streak:       ${user.streak || 0} days 🔥\n\n`;
    msg += `*Coach's Analysis:*\n${analysis}`;

    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Coach handler error:', err);
    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id,
      '❌ Failed to generate analysis. Please try again.');
  }
}
