import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { setupBot } from './server/bot';
import { validateTelegramInitData } from './server/middleware/auth';
import { db } from './server/services/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Protected API Routes
  app.get('/api/user', validateTelegramInitData, async (req, res) => {
    try {
      const telegramId = req.user?.id;
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized' });
      
      const user = await db.getUser(telegramId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/summary', validateTelegramInitData, async (req, res) => {
    try {
      const telegramId = req.user?.id;
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized' });
      
      const user = await db.getUser(telegramId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const summary = await db.getDailySummary(user.id, date);
      res.json(summary || { date, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, meals: [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start Bot if token exists
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    const bot = setupBot(botToken);
    // Use long polling for development
    bot.start({
      onStart: (botInfo) => {
        console.log(`Bot started as @${botInfo.username}`);
      }
    }).catch(console.error);
  } else {
    console.warn('TELEGRAM_BOT_TOKEN not found. Bot will not start.');
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
