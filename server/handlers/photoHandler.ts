import { Context } from 'grammy';
import { db } from '../services/db';
import { analyzeFoodImage } from '../services/nutrition/visionFallback';
import { setPendingMeal } from './pendingMealState';

export async function handlePhoto(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) {
    await ctx.reply('Please use /start first to register.');
    return;
  }

  const message = await ctx.reply('🔍 Analyzing your meal... Please wait.');

  try {
    const photo = ctx.message?.photo;
    if (!photo || photo.length === 0) return;

    const highestResPhoto = photo[photo.length - 1];
    const file = await ctx.api.getFile(highestResPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    // Initial analysis — quick detection pass
    const analysis = await analyzeFoodImage(base64Image, 'image/jpeg');

    if (!analysis) {
      await ctx.api.editMessageText(
        ctx.chat?.id as number, message.message_id,
        'Sorry, I could not analyze the image. Please try again or describe the food manually.'
      );
      return;
    }

    // Store pending with base64 for re-analysis after clarification
    setPendingMeal(telegramUser.id, {
      step: 'awaiting_clarification',
      analysis,
      userId: user.id,
      telegramMessageId: ctx.message?.message_id,
      photoUrl: fileUrl,
      base64Image,
      mimeType: 'image/jpeg',
      botMessageId: message.message_id,
    });

    // Build the clarification question — list detected items and ask for details
    const itemList = analysis.items.length > 0
      ? analysis.items.map(i => `  • ${i.name} (~${i.portion})`).join('\n')
      : `  • ${analysis.description}`;

    let msg = `🔍 *I detected these items:*\n`;
    msg += `${itemList}\n\n`;
    msg += `📝 *To get an accurate calorie count, please tell me:*\n\n`;
    msg += `1️⃣ *Cooking method* — e.g., grilled, fried, boiled, raw, baked?\n`;
    msg += `2️⃣ *Seasonings/sauces added* — e.g., olive oil, butter, salt, sauce?\n`;
    msg += `3️⃣ *Exact portions* — e.g., "chicken 150g, rice 1 cup, salad 100g"\n\n`;
    msg += `_If everything looks right, just tap "Looks correct ✅"_`;

    await ctx.api.editMessageText(
      ctx.chat?.id as number, message.message_id,
      msg,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Looks correct ✅', callback_data: `skip_clarify_${message.message_id}` }],
            [{ text: '❌ Cancel', callback_data: `discard_meal_${message.message_id}` }],
          ],
        },
      }
    );

  } catch (error) {
    console.error('Photo handler error:', error);
    try {
      await ctx.api.editMessageText(ctx.chat?.id as number, message.message_id,
        'An error occurred. Please try again.');
    } catch { /* ignore */ }
  }
}
