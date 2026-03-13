# Lumina-Cal — AI Nutrition Coach

An advanced AI-powered nutrition tracking Telegram Bot & Mini App — not just a tracker, a full adaptive AI coach.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange)

---

## ✨ Features

### 📸 Interactive Photo Analysis
- Multi-step: detect → ask cooking method/seasonings/portions → re-analyze → confirm
- Plate segmentation — each item separately with portion & calories
- DB enrichment: AI detects items, DB looks up exact nutrition (30-40% accuracy boost)

### 🔍 Smart Text Logging
- **3-tier lookup**: Fast food DB → MD5-hashed cache → AI
- **50+ chain items** (McDonald's, KFC, Subway, Starbucks, Burger King, etc.) — exact data
- **AI Food Substitution** — *"alternative to Big Mac"* → healthier swaps
- **AI Q&A Mode** — *"Is keto healthy?"* → personalized AI answer

### ⭐ Meal Score + Daily Score
- Every meal rated 1-10 with pros, cons, swap tips
- **Smart Daily Score** (0-10, grade A–F): calories / protein / sugar / fiber / consistency

### 🏃 Activity Tracking (`/activity`)
- 25+ exercise types with MET-based calorie calculations
- Shows: Eaten / Burned / Net daily balance
- Adjusts remaining calorie allowance by activity

### 🧠 Metabolic Adaptation (`/weight`)
- Weekly weight check-in with per-goal adaptive suggestions
- 30-day weight projection from trend data
- Adjusts carbs/calories based on actual vs expected rate

### 💧 Hydration Tracking (`/water`)
- Quick-add buttons: 250ml to 1.5L with progress bar

### 🛒 Smart Grocery List (`/groceries`)
- AI builds shopping list from last 7 days of meals, grouped by category

### 📅 Weekly Meal Planner (`/plan`)
- AI generates 7-day plan calibrated to your exact targets

### 📊 Food History (`/history`)
- Top foods by frequency, highest calorie foods, top sugar sources
- Meal timing analysis + fasting window detection

### 🧬 Micronutrients & Fiber
- Fiber, sugar, sodium tracked per meal and in daily totals
- Fiber shown with 25g daily target in nutrition table

### 🔮 Fasting Window Detection
- Calculated from meal timestamps automatically
- Detects intermittent fasting pattern (12h, 14h, 16h)
- Late dinner alerts (after 10pm)

### 📤 CSV Export (`/export`)
- Full meal history downloadable as `.csv`

### ⚡ Quick Add (`/quickadd`)
- Shows your top 6 most-logged foods as one-tap buttons
- One tap → instant nutrition lookup → confirm/discard

### 🔥 Streaks & Gamification (`/streak`)
- 🏅3d → 🏆7d → 💎14d → 👑30d → 🦾60d → 🌟100d

### 🎯 5 Fitness Goals with Activity Level
- Onboarding collects **activity level** (Sedentary/Light/Moderate/Active/Athlete)
- Used in TDEE calculation with correct PAL multiplier (1.2–1.9)
- Muscle Gain · Fat Loss · Maintain · Recomposition · Healthy Lifestyle

---

## 🏗️ Architecture

```
User (Telegram / Mini App)
          │
          ▼
    Grammy.js Bot (12 commands)
          │
          ▼
    Handlers Layer (thin — Telegram I/O only)
          │
          ▼
    ┌─────────────────────────────────────────┐
    │           Core Services Layer            │
    │                                          │
    │  nutritionEngine  — BMI/TDEE/macros      │
    │  goalEngine       — adaptive adjustments │
    │  aiAnalysisService— Gemini facade (swap) │
    │  foodService      — DB→Cache→AI lookup   │
    │  recommendationEngine — advice/fasting   │
    └─────────────────────────────────────────┘
          │
    ┌─────┴───────┐
    ▼             ▼
  Gemini 2.5   Supabase
  Flash (AI)   PostgreSQL
```

> **Design principle**: Telegram code never contains business logic. Handlers call core services. Swapping Gemini for GPT means changing only `aiAnalysisService.ts`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Zustand, Framer Motion |
| Backend | Node.js, Express, Grammy.js |
| AI | Google Gemini 2.5 Flash (via `aiAnalysisService` facade) |
| Database | Supabase (PostgreSQL) |
| Fast Food DB | Built-in (50+ items) → upgradeable to USDA/Nutritionix |
| Food Cache | MD5-hashed in-memory 24h TTL → upgradeable to Redis |
| Security | HMAC-SHA256 Telegram initData validation |
| Language | TypeScript throughout |

---

## 🚀 Setup

### Prerequisites
- Node.js v18+ · Telegram account
- [Supabase](https://supabase.com/) free tier
- [Google AI Studio](https://aistudio.google.com/) API key

### Environment Variables
```env
TELEGRAM_BOT_TOKEN=...
APP_URL=https://your-app-url
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NODE_ENV=development   # set to production to enable auth middleware
```

### Database Migration (Supabase SQL Editor)
```sql
-- Core user table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "telegramId" BIGINT UNIQUE NOT NULL,
  "firstName" TEXT NOT NULL, "lastName" TEXT, username TEXT,
  gender TEXT, height REAL, weight REAL, age INTEGER,
  bmi REAL, pbf REAL, "fitnessGoal" TEXT, "activityLevel" TEXT,
  streak INTEGER DEFAULT 0, "lastLogDate" TEXT, "targetWeight" REAL,
  "dailyCalorieGoal" REAL, "dailyProteinGoal" REAL,
  "dailyCarbsGoal" REAL, "dailyFatsGoal" REAL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Meal logs
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id),
  "telegramMessageId" BIGINT, description TEXT NOT NULL, "photoUrl" TEXT,
  nutrition JSONB NOT NULL, "mealScore" JSONB, "aiFeedback" TEXT,
  "loggedAt" TIMESTAMPTZ DEFAULT NOW(), "cuisineType" TEXT, "confidenceScore" REAL
);

-- Weight logs (for metabolic adaptation + prediction)
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  weight REAL NOT NULL,
  body_fat REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water logs (persistent hydration tracking)
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Run
```bash
npm install
npm run dev
```

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Onboarding → gender/height/weight/DOB/goal/**activity level** → BMI + targets |
| `/quickadd` | One-tap recent foods from your history |
| `/activity run 30` | Log exercise → burned kcal + net daily balance |
| `/weight 82.5` | Weekly weigh-in → metabolic adaptation + 30d projection |
| `/water` | Hydration tracker with quick-add buttons |
| `/ask Is keto healthy?` | AI nutrition Q&A personalized to your profile |
| `/history` | Top foods, sugar sources, timing, fasting window |
| `/groceries` | AI grocery list from your recent meals |
| `/plan` | AI 7-day personalized meal plan |
| `/weekly` | 7-day report + fasting analysis + AI insight |
| `/streak` | Streak counter + achievement badges |
| `/export` | Download all meals as CSV |

**Natural language (no command):**
- Photo → interactive analysis flow
- Text → fast food DB → cache → AI
- *"Alternative to Big Mac"* → food substitution
- *"Is rice bad for fat loss?"* → AI Q&A

---

## 📁 Project Structure

```
server/
├── bot.ts                       # 12 commands + all callback routing
├── middleware/
│   └── telegramAuth.ts          # HMAC-SHA256 WebApp initData validation
├── core/                        # Framework-agnostic business logic
│   ├── nutrition/
│   │   ├── nutritionEngine.ts   # BMI, BMR, TDEE, macros, 30d prediction
│   │   └── goalEngine.ts        # Adaptive calorie adjustment by goal
│   ├── ai/
│   │   └── aiAnalysisService.ts # AI provider facade (swap Gemini→GPT here)
│   ├── food/
│   │   └── foodService.ts       # DB→Cache→AI lookup + DB enrichment
│   └── recommendation/
│       └── recommendationEngine.ts # Macro issues, fasting detection, advice
├── handlers/
│   ├── startHandler.ts   ├── onboardingHandler.ts  ├── photoHandler.ts
│   ├── textHandler.ts    ├── mealConfirmHandler.ts ├── mealReplyFormatter.ts
│   ├── pendingMealState.ts ├── weeklyHandler.ts    ├── hydrationHandler.ts
│   ├── weightHandler.ts  ├── activityHandler.ts    ├── historyHandler.ts
│   ├── planningHandler.ts ├── exportHandler.ts     ├── askHandler.ts
│   └── quickAddHandler.ts
└── services/
    ├── db.ts              # Supabase CRUD
    ├── foodCache.ts       # MD5-hashed 24h in-memory cache
    ├── fastFoodDb.ts      # 50+ fast food items
    ├── activityStore.ts   # MET-based calorie burn
    ├── hydrationStore.ts  # Daily water (→ migrate to water_logs table)
    ├── portionMemory.ts   # Smart portion learning
    ├── dailyScore.ts      # 0-10 daily nutrition score (A-F grade)
    └── nutrition/
        ├── visionFallback.ts       # Gemini image + text analysis
        └── aiRecommendations.ts    # 6 AI functions

src/                     # Mini App frontend
├── pages/Dashboard.tsx
├── components/MealCard.tsx
└── store.ts
```

---

## 🔒 Security

The Mini App validates all requests from Telegram:

```typescript
// Frontend sends:
Authorization: tma <initData>

// Backend validates:
validateTelegramWebAppData(initData, botToken)
// → HMAC-SHA256 per Telegram's official spec
// → Rejects requests > 1 hour old
// → Attaches req.telegramUser on success
```

---

## 🚀 Production Roadmap

| Feature | Current | Upgrade |
|---------|---------|---------|
| Food Cache | MD5 in-memory 24h | Redis / Upstash |
| Fast Food DB | 50 built-in items | USDA / Nutritionix / FatSecret API |
| Hydration / Activity | `water_logs` & `activity_logs` Supabase Tables | Complete |
| Weight logs | `weight_logs` & `users` Supabase Tables | Complete |
| AI Provider | Gemini 2.5 Flash | Swap in `aiAnalysisService.ts` only |
| Mobile App | Telegram Mini App | React Native (reuses all `core/` services) |
| Deployment | Local | Railway / Fly.io / Vercel |

---

## 📄 License

MIT License
