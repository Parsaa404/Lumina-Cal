import { Context } from 'grammy';
import { db } from '../services/db';
import { getGenAI } from '../services/nutrition/visionFallback';

/**
 * AI Nutrition Q&A Mode — ChatGPT-like nutrition assistant inside the bot.
 * Triggered by /ask command OR via intent detection in textHandler.
 */
export async function handleAsk(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const text = ctx.message?.text || '';
  // Support: /ask Is rice bad for fat loss?
  const question = text.replace(/^\/ask\s*/i, '').trim();

  if (!question) {
    await ctx.reply(
      `🧠 *AI Nutrition Q&A*\n\nAsk me any nutrition or diet question!\n\nExamples:\n• \`/ask Is rice bad for fat loss?\`\n• \`/ask How much protein do I really need?\`\n• \`/ask Is keto healthy long-term?\`\n• \`/ask What should I eat before a workout?\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const user = await db.getUser(telegramUser.id);
  const loadingMsg = await ctx.reply('🧠 Thinking...');

  try {
    const genAI = getGenAI();

    const userContext = user
      ? `User profile: ${user.gender || 'unknown'}, ${user.weight || '?'}kg, Goal: ${user.fitnessGoal || 'general'}`
      : '';

    const prompt = `You are a professional nutritionist and fitness coach AI assistant.
${userContext}

Answer this question concisely and accurately:
"${question}"

Rules:
- Keep answers under 200 words
- Be practical and evidence-based  
- If the answer depends on the user's goal, tailor it to their profile
- Use bullet points for clarity when listing multiple items
- End with one actionable takeaway if relevant
- Do NOT recommend seeing a doctor for basic nutrition questions`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const answer = response.text?.trim() || 'I could not answer that. Please try rephrasing.';

    await ctx.api.editMessageText(
      ctx.chat?.id as number, loadingMsg.message_id,
      `🧠 *${question}*\n\n${answer}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('AI Q&A error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      'Could not answer right now. Please try again.');
  }
}

/**
 * Detect if user is asking a nutrition question (not logging food).
 */
export function isNutritionQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const questionWords = ['is ', 'are ', 'can ', 'should ', 'how ', 'what ', 'why ', 'does ', 'do ', 'when ', 'which '];
  const nutritionKeywords = ['eat', 'food', 'calorie', 'protein', 'carb', 'fat', 'diet', 'weight', 'muscle', 'keto', 'fast', 'healthy', 'nutrition', 'vitamin', 'supplement', 'workout', 'meal', 'sugar', 'fiber', 'macro', 'bulk', 'cut', 'gain', 'loss', 'intermittent'];

  const hasQuestionWord = questionWords.some(w => lower.startsWith(w));
  const hasNutritionWord = nutritionKeywords.some(w => lower.includes(w));
  const hasQuestionMark = lower.includes('?');

  return (hasQuestionWord && hasNutritionWord) || (hasQuestionMark && hasNutritionWord);
}
