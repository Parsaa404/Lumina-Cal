import { Context } from 'grammy';
import { db } from '../services/db';
import { analyzeFoodImage } from '../services/nutrition/visionFallback';
import { setPendingMeal } from './pendingMealState';

/**
 * Handles an uploaded photo.
 * New flow:
 *   1. Analyze image → detect items
 *   2. Show detected items + ask Q1 (cooking method)
 *   3. User answers → Q2 (seasonings)
 *   4. User answers → Q3 (portions in grams)
 *   5. User answers → re-analyze with all context → show confirmed preview
 */
export async function handlePhoto(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first to register.'); return; }

  const message = await ctx.reply('🔍 Analyzing your meal...');

  try {
    const photo = ctx.message?.photo;
    if (!photo || photo.length === 0) return;

    const highestRes = photo[photo.length - 1];
    const file       = await ctx.api.getFile(highestRes.file_id);
    const fileUrl    = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const resp   = await fetch(fileUrl);
    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const analysis = await analyzeFoodImage(base64, 'image/jpeg');

    if (!analysis) {
      await ctx.api.editMessageText(ctx.chat?.id as number, message.message_id,
        'Sorry, I could not analyze the image. Please try again or describe the food manually.');
      return;
    }

    // Store pending — starts at Q1 step
    setPendingMeal(telegramUser.id, {
      step: 'q_cooking',
      analysis,
      userId: user.id,
      telegramMessageId: ctx.message?.message_id,
      photoUrl: fileUrl,
      base64Image: base64,
      mimeType: 'image/jpeg',
      botMessageId: message.message_id,
    });

    // Show detected items + Q1
    const itemList = analysis.items && analysis.items.length > 0
      ? analysis.items.map(i => `  • ${i.name} (~${i.portion})`).join('\n')
      : `  • ${analysis.description}`;

    let msg = `✅ *I detected these items:*\n${itemList}\n\n`;
    msg += `📝 *To get an accurate calorie count, please tell me:*\n\n`;
    msg += `1️⃣ *Cooking method?*\n`;
    msg += `_e.g. grilled, fried, baked, boiled, steamed, raw_`;

    await ctx.api.editMessageText(
      ctx.chat?.id as number, message.message_id, msg,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔥 Grilled',  callback_data: `photo_cook_${message.message_id}_grilled` },
              { text: '🍳 Fried',    callback_data: `photo_cook_${message.message_id}_fried` },
              { text: '🫕 Baked',    callback_data: `photo_cook_${message.message_id}_baked` },
            ],
            [
              { text: '💧 Boiled',   callback_data: `photo_cook_${message.message_id}_boiled` },
              { text: '🌿 Steamed',  callback_data: `photo_cook_${message.message_id}_steamed` },
              { text: '🥗 Raw',      callback_data: `photo_cook_${message.message_id}_raw` },
            ],
            [
              { text: '⏭️ Skip all & use AI estimate', callback_data: `skip_clarify_${message.message_id}` },
            ],
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
