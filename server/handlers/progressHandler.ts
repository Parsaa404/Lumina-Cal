import { Context } from 'grammy';
import { db, supabase } from '../services/db';

// ── /progress command — show gallery ─────────────────────────
export async function handleProgress(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const user = await db.getUser(telegramUser.id);
  if (!user) { await ctx.reply('Please use /start first.'); return; }

  const { data: photos } = await supabase
    .from('progress_photos')
    .select('photo_url, note, takenAt')
    .eq('userId', user.id)
    .order('takenAt', { ascending: false })
    .limit(10);

  if (!photos || photos.length === 0) {
    await ctx.reply(
      `📸 *Progress Photos*\n\nNo photos yet!\n\nSend a body photo with the caption *"progress"* to log it here.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(
    `📸 *Your Progress Photos* (${photos.length} logged)\n\nSending your most recent photos...`,
    { parse_mode: 'Markdown' }
  );

  // Send the last 3 photos as a media group
  const recent = photos.slice(0, 3);
  for (const p of recent) {
    const date = new Date(p.takenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      await ctx.replyWithPhoto(p.photo_url, {
        caption: `📅 ${date}${p.note ? ` — ${p.note}` : ''}`,
      });
    } catch { /* photo may have expired */ }
  }
}

// ── Save a progress photo (called from photo handler) ─────────
export async function saveProgressPhoto(
  userId: string,
  photoUrl: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.from('progress_photos').insert({
    userId,
    photo_url: photoUrl,
    note: note || null,
    takenAt: new Date().toISOString(),
  });
  if (error) console.error('Progress photo save error:', error);
}

// ── Check if a photo message is a progress photo ─────────────
export function isProgressPhoto(ctx: Context): boolean {
  const caption = ctx.message?.caption?.toLowerCase() || '';
  return caption.includes('progress') || caption.includes('body');
}

// ── Handle progress photo upload ──────────────────────────────
export async function handleProgressPhoto(ctx: Context): Promise<boolean> {
  if (!isProgressPhoto(ctx)) return false;

  const telegramUser = ctx.from;
  if (!telegramUser) return false;

  const user = await db.getUser(telegramUser.id);
  if (!user) return false;

  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) return false;

  try {
    const fileId = photo[photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const note = ctx.message?.caption?.replace(/progress|body/gi, '').trim();

    await saveProgressPhoto(user.id, photoUrl, note);

    const { data: allPhotos } = await supabase
      .from('progress_photos').select('id').eq('userId', user.id);
    const count = allPhotos?.length || 1;

    await ctx.reply(
      `📸 *Progress photo saved!* (#${count})\n\nView all your photos with /progress`,
      { parse_mode: 'Markdown' }
    );
    return true;
  } catch (err) {
    console.error('Progress photo handler error:', err);
    return false;
  }
}
