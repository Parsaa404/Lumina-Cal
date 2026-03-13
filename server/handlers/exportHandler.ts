import { Context } from 'grammy';
import { InputFile } from 'grammy';
import { db } from '../services/db';

export async function handleExport(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const msg = await ctx.reply('📤 Preparing your export...');

  try {
    const meals = await db.getWeeklyMeals(user.id);

    if (meals.length === 0) {
      await ctx.api.editMessageText(ctx.chat?.id as number, msg.message_id,
        'No meals to export. Start logging meals first!');
      return;
    }

    const csvLines = [
      'Date,Time,Description,Calories,Protein (g),Carbs (g),Fats (g),Sugar (g),Sodium (mg),Meal Score,Cuisine'
    ];

    for (const meal of meals) {
      const loggedAt = new Date(meal.loggedAt);
      const date = loggedAt.toISOString().split('T')[0];
      const time = loggedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const { calories, protein, carbs, fats, sugar, sodium } = meal.nutrition;
      const score = meal.mealScore?.overall || '';
      const cuisine = meal.cuisineType || '';
      const desc = meal.description.replace(/"/g, '""');
      csvLines.push(`"${date}","${time}","${desc}",${calories},${protein},${carbs},${fats},${sugar || 0},${sodium || 0},${score},"${cuisine}"`);
    }

    const csvContent = csvLines.join('\n');
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    try { await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id); } catch { /* ignore */ }

    const fileName = `lumina_cal_${new Date().toISOString().split('T')[0]}.csv`;
    await ctx.replyWithDocument(
      new InputFile(csvBuffer, fileName),
      {
        caption: `📊 *Meal Export* — ${meals.length} meals\n_Import into Excel or Google Sheets_`,
        parse_mode: 'Markdown',
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    await ctx.api.editMessageText(ctx.chat?.id as number, msg.message_id,
      'Failed to generate export. Please try again.');
  }
}
