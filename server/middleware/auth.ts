import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function validateTelegramInitData(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  
  if (!initData) {
    return res.status(401).json({ error: 'Missing init data' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
      
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (calculatedHash !== hash) {
      return res.status(401).json({ error: 'Invalid init data' });
    }
    
    // Parse user data
    const userStr = urlParams.get('user');
    if (userStr) {
      req.user = JSON.parse(userStr);
    }
    
    next();
  } catch (error) {
    console.error('Error validating init data:', error);
    return res.status(401).json({ error: 'Invalid init data format' });
  }
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
