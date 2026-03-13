import { Context } from 'grammy';
import { db } from '../services/db';
import { analyzeFoodText } from '../services/nutrition/visionFallback';
import { formatMealPreview } from './mealReplyFormatter';
import { setPendingMeal } from './pendingMealState';

/**
 * /recipe [Recipe Name]
 * [Ingredient 1]
 * [Ingredient 2]
 * ...
 * 
 * Calculates total macros for a custom recipe and lets the user log it.
 */
export async function handleRecipe(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const text = ctx.message?.text || '';
  const lines = text.replace('/recipe', '').trim().split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    await ctx.reply(
      '🍲 *Recipe Builder*\n\n' +
      'Calculate precise macros for your custom meals. Format:\n\n' +
      '`/recipe Protein Pancakes\n100g oats\n2 large eggs\n1 scoop whey protein`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const recipeName = lines[0];
  const ingredients = lines.slice(1).join('\n');

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const loadingMsg = await ctx.reply(`👨‍🍳 Calculating macros for *${recipeName}*...`, { parse_mode: 'Markdown' });

  try {
    // We pass the whole ingredient list to the AI text analyzer
    const query = `Recipe: ${recipeName}. Ingredients: ${ingredients}. Treat this as one single meal and combine all macros into the final nutrition.`;
    const result = await analyzeFoodText(query);
    
    if (!result) {
      await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
        `Could not calculate nutrition for "${recipeName}". Try being more specific with ingredient amounts.`);
      return;
    }

    // Ensure description uses the recipe name
    result.description = `Recipe: ${recipeName}`;
    result.aiFeedback = `Calculated from ${lines.length - 1} ingredients.`;

    setPendingMeal(telegramUser.id, {
      step: 'awaiting_confirm',
      analysis: result,
      userId: user.id,
      botMessageId: loadingMsg.message_id,
    });

    await ctx.api.editMessageText(
      ctx.chat?.id as number, loadingMsg.message_id,
      formatMealPreview(result),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Log Recipe', callback_data: `confirm_meal_${loadingMsg.message_id}` },
            { text: '❌ Discard', callback_data: `discard_meal_${loadingMsg.message_id}` },
          ]],
        },
      }
    );

  } catch (error) {
    console.error('Recipe error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, loadingMsg.message_id,
      'Failed to calculate recipe macros. Please try again.');
  }
}
