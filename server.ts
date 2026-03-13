import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { setupBot } from './server/bot';
import { validateTelegramInitData } from './server/middleware/auth';
import { db } from './server/services/db';
import { startReminders } from './server/services/reminders';

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
      
      const weightLogs = await db.getWeightHistory(user.id);
      if (weightLogs.length > 0) {
        user.weight = weightLogs[weightLogs.length - 1].weight;
      } else {
        user.weight = undefined;
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/test-user/:id', async (req, res) => {
    const telegramId = Number(req.params.id);
    const user = await db.getUser(telegramId);
    res.json(user);
  });

  app.get('/api/summary', validateTelegramInitData, async (req, res) => {
    try {
      const telegramId = Number(req.user?.id);
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      
      if (!telegramId || isNaN(telegramId)) return res.status(401).json({ error: 'Unauthorized' });
      
      const user = await db.getUser(telegramId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const summary = await db.getDailySummary(user.id, date);

      res.json({
        date,
        totalCalories: summary?.totalCalories || 0,
        totalProtein: summary?.totalProtein || 0,
        totalCarbs: summary?.totalCarbs || 0,
        totalFats: summary?.totalFats || 0,
        totalSugar: summary?.totalSugar || 0,
        totalSodium: summary?.totalSodium || 0,
        waterAmount: summary?.waterAmount || 0,
        caloriesBurned: summary?.caloriesBurned || 0,
        activities: summary?.activities || [],
        meals: summary?.meals || []
      });
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
        startReminders(bot);
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
