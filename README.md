# Lumina-Cal — AI Nutrition Coach

An advanced AI-powered nutrition tracking Telegram Bot & Mini App — not just a tracker, a full adaptive AI coach.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange)

---

## ✨ Feature Overview

### 📸 Interactive Photo Analysis
- Bot detects all food items, then asks: cooking method, seasonings, and exact portions
- Re-analyzes image with your corrections (fried vs. grilled = up to 50% calorie difference)
- Plate segmentation — each item listed with individual portion & calories
- Confirm-to-Log: ✅ Log / ❌ Discard before anything is saved

### 🔍 Smart Text Logging
- **3-tier lookup**: Fast food database → Cache → AI analysis
- **Fast Food Database** — 50+ items from McDonald's, KFC, Subway, Starbucks, Burger King, Pizza Hut, Domino's — exact nutrition data, no AI guessing
- **Food Cache** — repeated foods returned instantly (24h TTL)
- **AI Food Substitution** — type *"alternative to Big Mac"* → healthier swaps with calorie comparison
- **AI Q&A Mode** — type any nutrition question → personalized AI answer

### ⭐ Meal Score + Daily Score
- Every meal rated 1-10 with pros, cons, and food swap tips
- **Smart Daily Score** (0-10, grade A–F) based on: calories, protein, sugar, fiber, consistency
- Visual score breakdown with progress bars

### 🏃 Activity & Calorie Balance (`/activity`)
```
/activity run 30
→ Run 30min: 280 kcal burned

Daily Balance:
  Eaten:   2100 kcal
  Burned:   420 kcal
  Net:     1680 kcal
```
Supports 25+ exercise types: run, gym, hiit, swim, bike, yoga, crossfit, football...

### 🧠 Metabolic Adaptation (`/weight`)
```
/weight 82.5
→ -0.3kg vs last week → On track!
→ 🎯 Stay the course — great progress!
```
Weekly weight check-in with AI analysis of progress rate vs goal, suggests calorie/carb adjustments.

### 💧 Hydration Tracking (`/water`)
- Quick-add buttons: 250ml / 500ml / 750ml / 1L / 1.5L
- Visual progress bar toward 2.5L daily goal

### 🛒 Smart Grocery List (`/groceries`)
- AI builds a personalized shopping list from your last 7 days of meals
- Grouped by: Proteins, Vegetables, Grains, Dairy, Fruits, Pantry

### 📅 Weekly Meal Planner (`/plan`)
- AI generates a full 7-day meal plan calibrated to your exact macro targets
- Practical meals with per-meal calories and protein shown

### 📊 Food History Intelligence (`/history`)
- Top foods by frequency
- Most calorie-dense foods
- Top sugar sources
- Best protein sources
- Meal timing analysis (late-night eating detection)

### 🧬 Micronutrients & Fiber
- Fiber, sugar, and sodium tracked and displayed per meal
- Fiber shown in daily nutrition table (target 25-30g)
- Sugar warnings when daily total exceeds 35g

### 📤 CSV Export (`/export`)
- Full meal history as `.csv` (Date, Time, Description, all macros, Fiber, Sodium, Score, Cuisine)
- Import into Excel, Google Sheets

### 🔥 Gamification (`/streak`)
- 🏅3d → 🏆7d → 💎14d → 👑30d → 🦾60d → 🌟100d

### 🎯 5 Fitness Goals
Muscle Gain · Fat Loss · Maintain · Recomposition · Healthy Lifestyle

### 🧬 Body Profile (Onboarding)
BMI + Body Fat % from gender, height, weight, and date of birth → AI-generates personalized daily macro targets

---

## 📱 Mini App Dashboard
- BMI + Body Fat % card · Streak badge · Animated calorie progress bar
- Per-macro progress bars with red over-limit alerts
- Meal score badges (green/amber/red) · AI feedback per meal · Daily score widget
- Sugar warning · Over-limit banner · Goal-aware AI insight

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Zustand, Framer Motion |
| Backend | Node.js, Express, Grammy.js |
| AI | Google Gemini 2.5 Flash |
| Database | Supabase (PostgreSQL) |
| Fast Food DB | Built-in (50+ items, upgradeable to USDA/OpenFoodFacts) |
| Food Cache | In-memory 24h TTL → upgradeable to Redis/Upstash |
| Language | TypeScript |

---

## 🚀 Setup

### Prerequisites
- Node.js v18+ · Telegram account
- [Supabase](https://supabase.com/) free tier
- [Google AI Studio](https://aistudio.google.com/) API key

### 1. Create Bot
1. Message [@BotFather](https://t.me/botfather) → `/newbot` → save token
2. `/setmenubutton` → set your Mini App URL

### 2. Environment Variables
```env
TELEGRAM_BOT_TOKEN=...
APP_URL=https://your-app-url
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### 3. Database (Supabase SQL Editor)
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "telegramId" BIGINT UNIQUE NOT NULL,
  "firstName" TEXT NOT NULL, "lastName" TEXT, username TEXT,
  gender TEXT, height REAL, weight REAL, age INTEGER,
  bmi REAL, pbf REAL, "fitnessGoal" TEXT,
  streak INTEGER DEFAULT 0, "lastLogDate" TEXT, "targetWeight" REAL,
  "dailyCalorieGoal" REAL, "dailyProteinGoal" REAL,
  "dailyCarbsGoal" REAL, "dailyFatsGoal" REAL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id),
  "telegramMessageId" BIGINT, description TEXT NOT NULL, "photoUrl" TEXT,
  nutrition JSONB NOT NULL, "mealScore" JSONB, "aiFeedback" TEXT,
  "loggedAt" TIMESTAMPTZ DEFAULT NOW(), "cuisineType" TEXT, "confidenceScore" REAL
);
```

### 4. Run
```bash
npm install
npm run dev
```

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Onboarding → BMI/PBF calculation → AI nutrition targets |
| `/activity run 30` | Log exercise → calories burned + net daily balance |
| `/weight 82.5` | Weekly weight check-in → metabolic adaptation suggestion |
| `/water` | Hydration tracker with quick-add buttons |
| `/ask Is keto healthy?` | AI nutrition Q&A with personalized answers |
| `/history` | Food history: top foods, sugar sources, timing analysis |
| `/groceries` | AI grocery list from your recent meals |
| `/plan` | AI 7-day personalized meal plan |
| `/weekly` | 7-day report + AI coach insight |
| `/streak` | Streak counter + achievement badges |
| `/export` | Download all meals as CSV |

**Natural language (no command needed):**
- Send a **photo** → interactive analysis with clarification flow
- Type food → meal analysis (fast food DB → cache → AI)
- *"Alternative to Big Mac"* → food substitution
- *"Is rice bad for fat loss?"* → AI Q&A

---

## 📁 Project Structure

```
server/
├── bot.ts                     # 11 commands + callback routing
├── handlers/
│   ├── startHandler.ts        # /start + onboarding
│   ├── onboardingHandler.ts   # BMI + fitness goal + AI targets
│   ├── photoHandler.ts        # Photo → clarification → re-analyze
│   ├── textHandler.ts         # fastFoodDb → cache → AI + Q&A intent
│   ├── mealConfirmHandler.ts  # confirm/discard + daily score display
│   ├── mealReplyFormatter.ts  # Clean macro table + fiber + daily progress
│   ├── pendingMealState.ts    # Two-step pending state
│   ├── weeklyHandler.ts       # /weekly + /streak
│   ├── hydrationHandler.ts    # /water + callbacks
│   ├── weightHandler.ts       # /weight + metabolic adaptation
│   ├── activityHandler.ts     # /activity + MET calorie burn
│   ├── historyHandler.ts      # /history + food intelligence
│   ├── planningHandler.ts     # /groceries + /plan
│   ├── exportHandler.ts       # /export CSV file
│   └── askHandler.ts          # /ask + nutrition Q&A intent
└── services/
    ├── db.ts                  # Supabase CRUD
    ├── foodCache.ts           # 24h in-memory cache
    ├── fastFoodDb.ts          # Built-in fast food database (50+ items)
    ├── activityStore.ts       # Daily activity log + MET calculations
    ├── hydrationStore.ts      # Daily water intake
    ├── portionMemory.ts       # Smart portion learning per user/food
    ├── dailyScore.ts          # Smart daily score (0-10, grade A-F)
    └── nutrition/
        ├── visionFallback.ts  # Gemini: image + text + context re-analysis
        └── aiRecommendations.ts # 6 AI functions: nutrition plan, weekly insight,
                                #   metabolic adjustment, grocery list, meal plan,
                                #   food substitution

src/
├── pages/Dashboard.tsx        # Full Mini App dashboard
├── components/MealCard.tsx    # Meal card with score + AI tip
└── store.ts                   # Zustand state
```

---

## 🔧 Architecture

```
User (Telegram)
      │
      ▼
Grammy.js Bot (11 commands)
  ├── Photo → Detect → Clarify → Re-analyze → Confirm → Log → Daily Score
  ├── Text  → FastFoodDB → Cache → AI → Q&A? → Sub? → Confirm → Log
  ├── /activity → MET Calc → Calories Burned → Net Balance
  ├── /weight  → Weekly Trend → Metabolic Adaptation
  ├── /water   → Hydration Progress
  ├── /ask     → Gemini Q&A with user profile context
  ├── /history → Meal pattern analysis + timing
  ├── /groceries → Recent meals → AI Shopping List
  ├── /plan    → User targets → AI 7-Day Plan
  ├── /weekly  → 7-day stats + timing + AI Insight
  └── /export  → CSV file download
      │
      ├── Gemini 2.5 Flash (AI backbone)
      ├── Supabase PostgreSQL (persistence)
      └── In-Memory Stores (cache, water, activity, portions, weight, pending)
```

---

## 🚀 Production Roadmap

| Feature | Current | Upgrade |
|---------|---------|---------|
| Food Cache | In-memory 24h | Redis / Upstash |
| Fast Food DB | 50 built-in | USDA / OpenFoodFacts API |
| Activity / Water / Portions | In-memory | Supabase columns |
| Activity data | Manual input | Apple Health / Google Fit |
| Image Storage | Telegram CDN | Supabase Storage |
| Deployment | Local | Railway / Fly.io / Vercel |

---

## 📄 License

MIT License
