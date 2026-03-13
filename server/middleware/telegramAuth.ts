/**
 * Telegram WebApp Init Data Security — HMAC-SHA256 validation.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import { createHmac } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected  = createHmac('sha256', secretKey).update(checkString).digest('hex');
    return expected === hash;
  } catch { return false; }
}

export function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'development') { next(); return; }
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('tma ')) { res.status(401).json({ error: 'Missing Telegram auth' }); return; }
  const initData = auth.slice(4);
  const params   = new URLSearchParams(initData);
  const authDate = parseInt(params.get('auth_date') || '0');
  if (Math.floor(Date.now() / 1000) - authDate > 3600) { res.status(401).json({ error: 'Auth expired' }); return; }
  if (!validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN || '')) { res.status(401).json({ error: 'Invalid signature' }); return; }
  try { const u = params.get('user'); if (u) (req as any).telegramUser = JSON.parse(u); } catch { /* ignore */ }
  next();
}
