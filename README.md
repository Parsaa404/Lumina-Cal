# Lumina-Cal— Smart Nutrition Tracker

An AI-powered nutrition tracking Telegram Bot & Mini App that makes calorie logging effortless.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-orange)

Send a photo of your food or describe what you ate — AI analyzes everything, scores your meal, and gives you smart nutrition advice. Track your progress in a beautiful dashboard.

---

## ✨ Core Features

### 🤖 Smart Meal Analysis
- **📸 Interactive Photo Flow** — Send a photo. The bot:
  1. Detects all food items with initial portion estimates
  2. Lists each item and asks: cooking method, seasonings/sauces added, exact portion sizes
  3. Re-analyzes the same image with your corrections for much higher accuracy
  4. Shows the final result with ✅ Log / ❌ Discard buttons
- **🔍 Plate Segmentation** — Each item detected separately (e.g., "Grilled chicken 150g — 230 kcal")
- **✍️ Text Logging** — Type what you ate. AI parses it, checks cache, and shows a preview before logging.
- **⚡ Food Cache** — Repeated foods served instantly from cache (chicken, rice, eggs, etc.)
- **📊 Clean Nutrition Display** — Macros shown as an aligned table: Calories / Protein / Carbs / Fats — no emojis, clean and readable

### ⭐ Meal Score System
Every meal gets an AI-powered quality score (1-10) with:
- ✅ **Pros** — What's nutritionally good about the meal
- ⚠️ **Cons** — Areas for improvement
- 💡 **Smart Feedback** — Specific food swap suggestions (e.g., *"Replace white rice with brown rice for extra fiber"*)

### ✅ Confirm-to-Log
Meals aren't logged automatically. After analysis, you see a preview with:
- Full nutrition breakdown
- Meal score and AI feedback
- **✅ Log Meal** or **❌ Discard** buttons

### 🎯 5 Fitness Goals
During onboarding, choose your goal — all recommendations adapt accordingly:
| Goal | Strategy |
|------|----------|
| 💪 Muscle Gain | Caloric surplus, high protein |
| 🔥 Fat Loss | 20-25% deficit, very high protein |
| ⚖️ Maintain Weight | Maintenance calories, balanced macros |
| 💪 Recomposition | Slight deficit, maximum protein |
| 🥗 Healthy Lifestyle | Slight deficit, nutrient-dense focus |

### 📊 Body Profile
Automated onboarding collects gender, height, weight, and date of birth to calculate:
- **BMI** with category labels (Underweight / Normal / Overweight / Obese)
- **Body Fat %** using the Deurenberg formula with gender-specific categories
- **AI-generated daily targets** (calories, protein, carbs, fats) personalized to your body and goal

### ⚠️ Smart Warnings
Real-time alerts when you exceed limits:
- 🔴 **Over calorie limit** — with action items (drink water, walk, skip snacks)
- 🍬 **High sugar (>35g)** — with specific swap suggestions
- 🥩 **Low protein** — alerts when protein falls behind calorie consumption
- Per-macro red alerts at 120%+ threshold

### 🔥 Gamification & Streaks
- Daily logging streak counter
- Achievement unlocks:
  - 🏅 3 days — Getting Started
  - 🏆 7 days — Week Champion
  - 💎 14 days — Two-Week Legend
  - 👑 30 days — Monthly Master
  - 🦾 60 days — Iron Will
  - 🌟 100 days — Centurion

### 📊 Weekly Reports (`/weekly`)
AI-generated 7-day summary including:
- Average daily macros
- Total meals & days tracked
- Average meal quality score
- Current streak
- Personalized AI insight with improvement suggestions

---

## 📱 Dashboard (Mini App)

A modern, responsive dashboard inside Telegram:

- **Body Profile Card** — BMI & Body Fat % with visual bars and category badges
- **Fitness Goal Tag** — Your selected goal displayed prominently
- **Streak Badge** — 🔥 counter in the header
- **Calorie Progress** — Animated progress bar with red highlight when over limit
- **Macro Tracking** — Protein/Carbs/Fats progress bars with red alerts
- **Meal Score Badges** — Color-coded score on each meal card (green/amber/red)
- **AI Feedback** — Smart tips shown under each meal card
- **Sugar Warning Banner** — Amber alert when sugar exceeds daily limit
- **Over-Limit Banner** — Red alert with actionable advice
- **AI Insight** — Goal-aware daily suggestion engine

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Zustand, Framer Motion |
| Backend | Node.js, Express, Grammy.js |
| AI | Google Gemini 2.5 Flash (text), Gemini 2.5 Flash (vision) |
| Database | Supabase (PostgreSQL) |
| Caching | In-memory food cache (24h TTL, upgradeable to Redis/Upstash) |
| Language | TypeScript throughout |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Telegram account
- [Supabase](https://supabase.com/) account (free tier)
- [Google AI Studio](https://aistudio.google.com/) API key

### 1. Bot Setup
1. Open Telegram → [@BotFather](https://t.me/botfather)
2. `/newbot` → follow instructions → save the **API Token**
3. `/setmenubutton` → set your Mini App URL

### 2. Environment Variables
```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `APP_URL` | Your Mini App URL |
| `GEMINI_API_KEY` | From Google AI Studio |
| `SUPABASE_URL` | From Supabase dashboard |
| `SUPABASE_ANON_KEY` | From Supabase dashboard |

### 3. Database Setup
Run this SQL in the **Supabase SQL Editor**:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "telegramId" BIGINT UNIQUE NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  username TEXT,
  gender TEXT,
  height REAL,
  weight REAL,
  age INTEGER,
  bmi REAL,
  pbf REAL,
  "fitnessGoal" TEXT,
  streak INTEGER DEFAULT 0,
  "lastLogDate" TEXT,
  "targetWeight" REAL,
  "dailyCalorieGoal" REAL,
  "dailyProteinGoal" REAL,
  "dailyCarbsGoal" REAL,
  "dailyFatsGoal" REAL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Meals table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id),
  "telegramMessageId" BIGINT,
  description TEXT NOT NULL,
  "photoUrl" TEXT,
  nutrition JSONB NOT NULL,
  "mealScore" JSONB,
  "aiFeedback" TEXT,
  "loggedAt" TIMESTAMPTZ DEFAULT NOW(),
  "cuisineType" TEXT,
  "confidenceScore" REAL
);
```

### 4. Install & Run
```bash
npm install
npm run dev
```

> **Tip**: Use [ngrok](https://ngrok.com/) to expose your local server for Telegram Mini App testing.

---

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register + full onboarding (gender, height, weight, DOB, fitness goal) |
| `/weekly` | AI-powered 7-day nutrition report |
| `/streak` | View your logging streak and achievements |

### Meal Logging
- Send a **photo** → AI analyzes → preview with ✅ Log / ❌ Discard buttons
- Send a **text description** → AI analyzes (cached if repeated) → preview with ✅ Log / ❌ Discard buttons

---

## 📁 Project Structure

```
├── server/
│   ├── bot.ts                     # Bot setup & command registration
│   ├── server.ts                  # Express server entry point
│   ├── handlers/
│   │   ├── startHandler.ts        # /start command & welcome
│   │   ├── onboardingHandler.ts   # Multi-step onboarding flow
│   │   ├── onboardingState.ts     # In-memory onboarding session state
│   │   ├── photoHandler.ts        # Photo meal analysis
│   │   ├── textHandler.ts         # Text meal analysis (with cache)
│   │   ├── mealConfirmHandler.ts  # ✅ Log / ❌ Discard callbacks
│   │   ├── mealReplyFormatter.ts  # Preview & confirmed message formatters
│   │   ├── pendingMealState.ts    # Temp storage for unconfirmed meals
│   │   └── weeklyHandler.ts       # /weekly & /streak commands
│   └── services/
│       ├── db.ts                  # Supabase database operations
│       ├── foodCache.ts           # In-memory food result cache
│       └── nutrition/
│           ├── visionFallback.ts  # Gemini AI analysis (image + text)
│           └── aiRecommendations.ts # AI nutrition plan & weekly insights
├── src/
│   ├── components/
│   │   ├── MealCard.tsx           # Meal card with score badge & AI tip
│   │   └── NutritionChart.tsx     # Macro pie chart
│   ├── pages/
│   │   └── Dashboard.tsx          # Full dashboard with all features
│   ├── App.tsx                    # Main app with mock data
│   └── store.ts                   # Zustand state management
├── shared/
│   └── types.ts                   # Shared TypeScript interfaces
└── package.json
```

---

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Telegram User                       │
│         (Photo / Text / Commands)                    │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│              Grammy.js Bot                            │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │
│  │ /start   │ │ /weekly  │ │ Photo/Text Handler   │  │
│  │ Onboard  │ │ /streak  │ │ → Preview + Confirm  │  │
│  └──────────┘ └──────────┘ └─────────────────────┘  │
└──────────────┬──────────────────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐    ┌──────────────┐
│ Supabase │    │ Gemini AI    │
│ Database │    │ 2.5 Flash    │
│ (Users,  │    │ (Vision +    │
│  Meals)  │    │  Text +      │
│          │    │  Nutrition)  │
└──────────┘    └──────────────┘
               │
               ▼
      ┌──────────────┐
      │ Food Cache   │
      │ (In-Memory)  │
      └──────────────┘
```

---

## 📱 Migration to React Native / Expo

This architecture is designed for easy porting to native mobile:
1. **State management** — Zustand store reusable as-is
2. **Styling** — Tailwind CSS → NativeWind (zero-change classes)
3. **Navigation** — React Router → React Navigation
4. **Camera** — Add `expo-camera` for direct photo capture
5. **Storage** — Replace `window.Telegram.WebApp` with `expo-secure-store`

---

## 🚀 Production Upgrades

| Feature | Current | Production |
|---------|---------|------------|
| Food Cache | In-memory Map | Redis / Upstash |
| Image Storage | Telegram URL | Supabase Storage / S3 |
| Deployment | Local | Vercel / Railway / Fly.io |
| Monitoring | Console logs | Sentry / LogRocket |

---

## 📄 License

This project is licensed under the MIT License.
