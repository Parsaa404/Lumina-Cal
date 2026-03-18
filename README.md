# Lumina-Cal — AI Nutrition Coach

An advanced AI-powered Telegram bot & Mini App. Not just a calorie tracker — a full adaptive AI fitness coach.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-orange)
![Supabase](https://img.shields.io/badge/Supabase-DB-green)

---

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Onboarding — profile setup + AI nutrition plan |
| `/water [ml]` | Log water with quick-add buttons + progress bar |
| `/weight [kg]` | Weekly weigh-in with adaptive AI recommendations + ETA to goal |
| `/target [kg]` | Set a target weight goal |
| `/trend` | ASCII weight chart + ETA prediction |
| `/activity` | Smart activity logging with type-specific questions |
| `/scan` | Barcode scanner — photo → FatSecret lookup → one-tap log |
| `/fast start\|stop` | Fasting timer with real-time duration + trophy milestones |
| `/progress` | Gallery of saved body progress photos |
| `/coach` | AI weekly analysis — strengths, issues, actionable tip |
| `/repeat` | Re-log any of your last 6 meals with one tap |
| `/predict` | AI prediction of today's final calorie intake |
| `/report` | Full 30-day monthly nutrition report |
| `/badges` | View all earned achievement badges |
| `/history` | Analytics: top foods, meal timing, fasting window |
| `/weekly` | Weekly progress report with ASCII charts |
| `/streak` | Logging streak + earned badges |
| `/plan` | AI 7-day personalized meal planner |
| `/groceries` | AI shopping list from recent meals |
| `/quickadd` | One-tap log from your top frequent foods |
| `/recipe [ingredients]` | Nutrition for a custom recipe |
| `/export` | Download full meal history as CSV |
| `/ask [question]` | AI nutrition Q&A |

---

## ✨ Feature Highlights

### 📸 Interactive Photo Analysis
- Multi-step pipeline: detect → ask cooking method/seasonings/portions → re-analyze → confirm
- Plate segmentation — each item separately with portion & calories
- DB enrichment: AI detects items, internal DB lookup for exact nutrition (30-40% accuracy boost)

### 🔍 Smart Text Logging
- **3-tier lookup**: Fast food DB → cache → Gemini AI
- **50+ chain items** (McDonald's, KFC, Subway, Starbucks, etc.)
- **AI Food Substitution** — `"alternative to Big Mac"` → healthier swaps
- **AI Q&A** — `/ask "is keto healthy?"` → personalized answer

### 📊 Visual Macro Progress Bars
After every meal, ASCII progress bars appear automatically:
```
🔥 Cal  ████████░░ 1400/2100
🥩 Pro  █████░░░░░ 75/150g
🍞 Carb ██████░░░░ 180/250g
🥑 Fat  ███████░░░ 55/70g
```

### 💡 Smart Snack Suggestions
> *"You need ~40g more protein. Try: Greek yogurt · Boiled eggs · Protein shake"*

### 🏃 Smart Activity Tracking
- Full inline menu — no typing required
- **Walking** → steps or duration + pace → precise MET calculation
- **Gym** → intensity + exercise list with weights → duration
- **Swimming** → stroke type (freestyle/breaststroke/backstroke/butterfly) → duration
- 20+ activity types with real-time Eaten / Burned / Net balance

### ⚖️ Weight & Prediction
- Weekly adaptive calorie/carb recommendations
- **ETA to target** after every log: *"📅 ETA to 70kg: ~May 12, 2026 (6 weeks)"*
- `/trend` ASCII chart shows trajectory + weekly rate of change

### 📷 Barcode Scanner (`/scan`)
- Photo of product barcode → Gemini Vision reads it → FatSecret looks up nutrition → one-tap log

### ⏱ Fasting Tracker (`/fast`)
- `/fast start` → timer begins
- `/fast stop` → shows exact duration + estimated fat burned + trophy (12h 🟢 / 16h ⚡ / 18h 🔥 / 24h 🏅)

### 📸 Progress Photos (`/progress`)
- Send a body photo with caption `"progress"` → auto-saved
- `/progress` shows your last 3 photos with dates

### 🤖 AI Daily Coach (`/coach`)
- Analyzes your last 7 days of nutrition + weight trend
- Tells you what you're doing well, your biggest issue, and one actionable fix

### 🔄 Meal Repeat (`/repeat`)
- Shows your last 6 unique meals as buttons
- One tap → instantly re-logged with full nutrition, no photo needed

### 🔮 Calorie Prediction (`/predict`)
- Gemini analyzes your 14-day eating patterns
- Predicts today's final intake + whether you'll be over/under goal

### 📄 Monthly Report (`/report`)
- Full 30-day summary: days logged, avg calories/protein/water, weight change, weekly breakdown

### 🏆 Achievement Badges (`/badges`)
19 badges across 6 categories:

| Category | Examples |
|----------|---------|
| 🔥 Streak | 3-Day Warrior → 🌟 Centurion (100 days) |
| 🥩 Protein | Protein Apprentice → 👑 Protein King (30 days) |
| 💧 Hydration | Hydration Hero → 🌊 Water Warrior |
| ⚖️ Weight | Scale Starter · Goal Crusher · Down 10kg |
| 🏃 Activity | Active Week · 🔥 Fitness Fanatic |
| 🍽️ Logging | Meal Tracker → 🧑‍🍳 Culinary Expert (100 meals) |

### ⭐ Meal Scoring
- Every meal rated 1-10 with pros, cons, swap tips
- Daily Score (A–F): calories / protein / sugar / fiber / consistency

### 🌅 Smart Reminders
- **8 AM** — Yesterday's summary + streak + today's goal
- **8 PM** — No meals logged? Nudge. Meals logged? Remaining budget recap

### ⚡ Other Features
- **Quick Add** — top 6 frequent foods as one-tap buttons
- **Weekly Planner** — AI 7-day meal plan
- **Grocery List** — AI shopping list from recent meals
- **Recipe Builder** — `/recipe chicken, rice, broccoli` → full macros
- **CSV Export** — full meal history download
- **Fasting Window Detection** — auto-detects 12h/14h/16h IF patterns

---

## 🏗️ Architecture

```
Telegram User
      │
      ▼
Grammy.js Bot (25+ commands)
      │
      ▼
Handlers Layer (thin — Telegram I/O only)
      │
      ├── activityHandler    scanHandler     fastHandler
      ├── weightHandler      trendHandler    progressHandler
      ├── coachHandler       repeatHandler   predictHandler
      ├── reportHandler      badgesHandler   mealReplyFormatter
      └── ... (20 more handlers)
      │
      ▼
Services Layer
  ├── db.ts               — Supabase client
  ├── reminders.ts        — Morning (8AM) + evening (8PM) auto-messages
  ├── badges.ts           — Achievement badge computation
  ├── dailyScore.ts       — Daily nutrition scoring (A-F)
  └── nutrition/
      ├── visionFallback.ts   — Gemini Vision (food + barcode OCR)
      ├── fatsecret.ts        — FatSecret barcode lookup
      ├── fastFoodDb.ts       — Local DB: 50+ chain items
      └── aiRecommendations.ts
      │
      ▼
Supabase (PostgreSQL)
  ├── users            — Profile, goals, streak, targetWeight
  ├── meals            — All logs with nutrition JSONB
  ├── weight_logs      — Weight history for trend/ETA
  ├── water_logs       — Hydration logs
  ├── activity_logs    — Exercise logs
  └── progress_photos  — Body photo URLs
      │
      ▼
Dashboard (React + Vite + Zustand)
  ├── Donut macro chart
  ├── Water & Activity cards
  ├── Current Weight & Target Goal card
  └── Meal list with nutrition scores
```

---

## 🚀 Setup

### Prerequisites
- Node.js 20+
- Supabase project
- Telegram Bot Token (from @BotFather)
- Gemini API Key ([Google AI Studio](https://aistudio.google.com))
- FatSecret API keys (optional — for `/scan` barcode lookup)

### Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
FATSECRET_CLIENT_ID=your_id        # optional
FATSECRET_CLIENT_SECRET=your_secret  # optional
```

### Database Setup

Run all SQL files in Supabase SQL Editor (in order):
1. `full_database_schema.sql` — main tables + RLS policies
2. `progress_photos_migration.sql` — progress photos table

### Run

```bash
npm install
npm run dev    # bot + dashboard on http://localhost:3000
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Bot Framework | Grammy.js |
| AI | Google Gemini 2.0 Flash |
| Barcode Lookup | FatSecret Platform API |
| Database | Supabase (PostgreSQL) |
| Dashboard | React 19 + Vite + Zustand |
| Language | TypeScript |

---

## 📄 License

MIT
