import { Context, InlineKeyboard } from 'grammy';
import { db } from '../services/db';
import { searchFoodByBarcode } from '../services/nutrition/fatsecret';
import { getGenAI } from '../services/nutrition/visionFallback';
import { buildProgressBar } from './mealReplyFormatter';

// Track users who have used /scan command recently
export const scanPendingUsers = new Set<number>();

// ── /scan command ─────────────────────────────────────────────
export async function handleScan(ctx: Context) {
  await ctx.reply(
    `📷 *Barcode Scanner*\n\nSend a clear photo of the product barcode and I'll look up its nutrition info automatically!\n\n_💡 Tip: Hold the camera close and ensure the barcode is well-lit._`,
    { parse_mode: 'Markdown' }
  );
}

// ── Photo handler — runs before normal food photo handler ─────
export async function handleScanPhoto(ctx: Context): Promise<boolean> {
  const telegramUser = ctx.from;
  if (!telegramUser) return false;
  if (!scanPendingUsers.has(telegramUser.id)) return false;
  scanPendingUsers.delete(telegramUser.id);

  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) return false;

  const loadingMsg = await ctx.reply('🔍 Reading barcode...');

  try {
    // Download the best-quality photo as base64
    const fileId = photo[photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(photoUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Use Gemini to extract the barcode number
    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64,
            }
          },
          {
            text: `Look at this image and find any barcode (EAN-13, UPC-A, or similar). 
Extract ONLY the numeric barcode number.
Reply with ONLY the digits, nothing else. 
If you cannot find a barcode, reply with "NONE".`
          }
        ]
      }]
    });

    const barcodeText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NONE';
    const barcode = /^\d{6,14}$/.test(barcodeText) ? barcodeText : null;

    if (!barcode) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        loadingMsg.message_id,
        `❌ *No barcode detected.*\n\nMake sure the barcode is:\n• Clearly visible and not blurry\n• Well-lit\n• Taking up most of the frame\n\nAlternatively, describe the food in text and I'll analyze it!`,
        { parse_mode: 'Markdown' }
      );
      return true;
    }

    await ctx.api.editMessageText(
      ctx.chat!.id, loadingMsg.message_id,
      `🔍 Barcode detected: \`${barcode}\`\nLooking up product...`,
      { parse_mode: 'Markdown' }
    );

    // Look up in FatSecret
    const product = await searchFoodByBarcode(barcode);

    if (!product) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        loadingMsg.message_id,
        `❌ Barcode *${barcode}* not found in the nutrition database.\n\nYou can still log it manually — just describe the food:`,
        { parse_mode: 'Markdown' }
      );
      return true;
    }

    const n = product.nutrition;
    let msg = `✅ *Product Found!*\n\n`;
    msg += `📦 *${product.name}*\n\n`;
    msg += `🔥 Calories: *${Math.round(n.calories)} kcal*\n`;
    msg += `🥩 Protein:  ${Math.round(n.protein)}g\n`;
    msg += `🍞 Carbs:    ${Math.round(n.carbs)}g\n`;
    msg += `🥑 Fats:     ${Math.round(n.fats)}g\n`;
    if (n.fiber)  msg += `🌾 Fiber:    ${Math.round(n.fiber)}g\n`;
    if (n.sugar)  msg += `🍬 Sugar:    ${Math.round(n.sugar)}g\n`;
    if (n.sodium) msg += `🧂 Sodium:   ${Math.round(n.sodium)}mg\n`;
    msg += `\n_Per serving_\n\nLog this meal?`;

    const encoded = bufferProduct(product);
    const kb = new InlineKeyboard()
      .text('✅ Log this meal', `scan_log_${encoded}`)
      .text('❌ Cancel', 'scan_cancel');

    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, msg, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });

    return true;
  } catch (err) {
    console.error('Scan error:', err);
    await ctx.api.editMessageText(
      ctx.chat!.id, loadingMsg.message_id,
      `❌ Failed to process the image. Please try again.`
    );
    return true;
  }
}

// ── Callback: log or cancel ─────────────────────────────────
export async function handleScanCallback(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;
  await ctx.answerCallbackQuery();

  const data = ctx.callbackQuery?.data || '';

  if (data === 'scan_cancel') {
    try { await ctx.editMessageText('❌ Cancelled.', { reply_markup: { inline_keyboard: [] } }); } catch {}
    return;
  }

  if (data.startsWith('scan_log_')) {
    const user = await db.getUser(telegramUser.id);
    if (!user) return;

    try {
      const product = unbufferProduct(data.replace('scan_log_', ''));
      const streak = await db.updateStreak(telegramUser.id);

      await db.logMeal({
        userId: user.id,
        telegramMessageId: ctx.callbackQuery?.message?.message_id || 0,
        description: product.name,
        nutrition: product.nutrition,
        loggedAt: new Date().toISOString(),
        confidenceScore: 100,
      });

      const today = new Date().toISOString().split('T')[0];
      const summary = await db.getDailySummary(user.id, today);
      const totalCal = Math.round(summary?.totalCalories || 0);
      const calGoal  = user.dailyCalorieGoal || 2000;

      let msg = `✅ *${product.name}* logged!\n\n`;
      msg += `🔥 Cal  ${buildProgressBar(totalCal, calGoal)}\n`;
      if (user.dailyProteinGoal && summary)
        msg += `🥩 Pro  ${buildProgressBar(Math.round(summary.totalProtein), user.dailyProteinGoal)}\n`;
      if (streak > 1) msg += `\n🔥 ${streak}-day streak!`;

      await ctx.editMessageText(msg, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }
      });
    } catch (err) {
      console.error('Scan log error:', err);
      await ctx.editMessageText('❌ Failed to log meal. Please try again.');
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────
function bufferProduct(product: any): string {
  const slim = {
    name: product.name.substring(0, 60),
    nutrition: {
      calories: Math.round(product.nutrition.calories),
      protein:  Math.round(product.nutrition.protein),
      carbs:    Math.round(product.nutrition.carbs),
      fats:     Math.round(product.nutrition.fats),
      fiber:    Math.round(product.nutrition.fiber || 0),
      sugar:    Math.round(product.nutrition.sugar || 0),
      sodium:   Math.round(product.nutrition.sodium || 0),
    }
  };
  return encodeURIComponent(JSON.stringify(slim));
}

function unbufferProduct(encoded: string): any {
  return JSON.parse(decodeURIComponent(encoded));
}
