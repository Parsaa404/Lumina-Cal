import { Context } from 'grammy';
import { db } from '../services/db';
import { getGenAI } from '../services/nutrition/visionFallback';

export async function handlePredict(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply('🔮 Predicting today\'s intake...');

  try {
    // Gather data for last 14 days
    const days: string[] = [];
    for (let i = 13; i >= 1; i--) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
    }

    const historical = await Promise.all(days.map(async (day) => {
      const s = await db.getDailySummary(user.id, day);
      return {
        day,
        dayOfWeek: new Date(day).toLocaleDateString('en-US', { weekday: 'long' }),
        calories: Math.round(s?.totalCalories || 0),
        meals: s?.meals?.length || 0,
      };
    }));

    const today = new Date().toISOString().split('T')[0];
    const todayData = await db.getDailySummary(user.id, today);
    const soFarToday = Math.round(todayData?.totalCalories || 0);
    const mealsToday = todayData?.meals?.length || 0;
    const todayDow   = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = new Date().getHours();

    const histSummary = historical
      .filter(d => d.meals > 0)
      .map(d => `${d.dayOfWeek}: ${d.calories} kcal (${d.meals} meals)`)
      .join('\n');

    const prompt = `Based on this user's eating history, predict today's total calorie intake.

User goal: ${user.dailyCalorieGoal || 2000} kcal/day
Today (${todayDow}): ${soFarToday} kcal eaten so far (${mealsToday} meals, current hour: ${currentHour}:00)

Historical data (last 14 days):
${histSummary || 'No history yet'}

Return ONLY a JSON object with these fields (no markdown, no extra text):
{
  "predicted_total": <number: estimated final calories for today>,
  "confidence": <"low"|"medium"|"high">,
  "reason": "<one sentence why>",
  "suggestion": "<one actionable tip for the rest of the day>"
}`;

    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!prediction) throw new Error('Invalid AI response');

    const goal = user.dailyCalorieGoal || 2000;
    const predicted = prediction.predicted_total;
    const diff = predicted - goal;
    const diffStr = diff > 0 ? `+${Math.round(diff)} over` : `${Math.round(Math.abs(diff))} under`;
    const statusEmoji = diff > 100 ? '🔴' : diff < -200 ? '🔵' : '✅';

    let msg = `🔮 *Today's Calorie Prediction*\n\n`;
    msg += `So far today: *${soFarToday} kcal*\n`;
    msg += `Predicted total: *${Math.round(predicted)} kcal* ${statusEmoji}\n`;
    msg += `vs goal: *${diffStr} goal*\n`;
    msg += `Confidence: ${prediction.confidence}\n\n`;
    msg += `💡 ${prediction.reason}\n\n`;
    msg += `*Suggestion:* ${prediction.suggestion}`;

    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Calorie prediction error:', err);
    await ctx.api.editMessageText(
      ctx.chat!.id, loadingMsg.message_id,
      '❌ Not enough data yet to make a prediction. Keep logging meals!'
    );
  }
}
