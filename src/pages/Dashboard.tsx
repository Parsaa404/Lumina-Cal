import { useAppStore } from '../store';
import { MealCard } from '../components/MealCard';
import { motion } from 'motion/react';
import { Activity, Flame, Utensils, Heart, AlertTriangle, TrendingUp, Droplets, Footprints, Star, Zap, Scale, Target, ChevronRight } from 'lucide-react';
import { getTelegramData } from '../lib/telegram';

const GOAL_LABELS: Record<string, string> = {
  muscle_building: 'Muscle Gain',
  weight_loss: 'Weight Loss',
  maintenance: 'Maintenance',
};

function getBMICategory(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500', bg: 'bg-blue-500' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-500' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-500', bg: 'bg-amber-500' };
  return { label: 'Obese', color: 'text-red-500', bg: 'bg-red-500' };
}

function getPBFCategory(pbf: number, gender?: string): { label: string; color: string } {
  if (gender === 'male') {
    if (pbf < 14) return { label: 'Athletic', color: 'text-blue-500' };
    if (pbf < 18) return { label: 'Fit', color: 'text-emerald-500' };
    if (pbf < 25) return { label: 'Average', color: 'text-amber-500' };
    return { label: 'Above Avg', color: 'text-red-500' };
  } else {
    if (pbf < 21) return { label: 'Athletic', color: 'text-blue-500' };
    if (pbf < 25) return { label: 'Fit', color: 'text-emerald-500' };
    if (pbf < 32) return { label: 'Average', color: 'text-amber-500' };
    return { label: 'Above Avg', color: 'text-red-500' };
  }
}

export function Dashboard() {
  const { user, summary, isLoading, currentDate, fetchSummaryForDate } = useAppStore();

  const handleDateClick = (dateStr: string) => {
    if (dateStr === currentDate) return;
    const tgData = getTelegramData();
    const initData = tgData?.initData || '';
    fetchSummaryForDate(dateStr, initData);
  };

  const recentDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const isToday = currentDate === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const displayDateObj = new Date(currentDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB] dark:bg-[#0A0A0A]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-3"></div>
        </div>
      </div>
    );
  }

  if (!user || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#F9FAFB] dark:bg-[#0A0A0A]">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Welcome Setup</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Please answer the questions in Telegram to register.</p>
      </div>
    );
  }

  const calGoal = user.dailyCalorieGoal || 2000;
  const burned = summary.caloriesBurned || 0;
  const adjustedGoal = calGoal + burned;
  const calProgress = Math.min((summary.totalCalories / adjustedGoal) * 100, 100);
  const calRatio = summary.totalCalories / adjustedGoal;
  
  const proteinGoal = user.dailyProteinGoal || 150;
  const carbsGoal = user.dailyCarbsGoal || 200;
  const fatsGoal = user.dailyFatsGoal || 65;

  const overLimits: { name: string; percent: number }[] = [];
  if (calRatio > 1.05) overLimits.push({ name: 'Calories', percent: Math.round(calRatio * 100) });
  if (summary.totalProtein > proteinGoal * 1.25) overLimits.push({ name: 'Protein', percent: Math.round((summary.totalProtein / proteinGoal) * 100) });
  if (summary.totalCarbs > carbsGoal * 1.25) overLimits.push({ name: 'Carbs', percent: Math.round((summary.totalCarbs / carbsGoal) * 100) });

  const scoredMeals = summary.meals.filter(m => m.mealScore?.overall);
  const avgScore = scoredMeals.length > 0
    ? (scoredMeals.reduce((s, m) => s + (m.mealScore?.overall || 0), 0) / scoredMeals.length).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#FCFCFC] dark:bg-[#0A0A0A] p-4 pb-24 text-zinc-900 dark:text-zinc-100 font-sans"
    >
      {/* Sleek Header */}
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {isToday ? 'Today' : displayDateObj.toLocaleDateString('en-US', { weekday: 'long' })}
          </h1>
          <p className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">
            {displayDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {user.streak && user.streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/15">
              <Zap size={14} className="text-orange-500 fill-orange-500" />
              <span className="text-xs font-bold tracking-wide text-orange-600 dark:text-orange-400">{user.streak}</span>
            </div>
          )}
          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center font-bold text-sm text-zinc-600 dark:text-zinc-400">
            {user.firstName.charAt(0)}
          </div>
        </div>
      </header>

      {/* Date Selector (Non-scrollable, fits on screen) */}
      <div className="flex justify-between w-full gap-1 mb-6">
        {recentDays.map((dateObj) => {
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const dateStr = new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
          const isSelected = dateStr === currentDate;
          
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(dateStr)}
              className={`flex-1 flex flex-col items-center justify-center aspect-[4/5] max-w-[48px] rounded-[16px] outline-none transition-all duration-200 ${
                isSelected 
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md scale-105' 
                  : 'bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800/80'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isSelected ? 'opacity-90' : ''}`}>
                {dateObj.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </span>
              <span className={`text-[15px] font-extrabold tracking-tight ${isSelected ? '' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {dateObj.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero Stats Card */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-[#121212] rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-zinc-100/80 dark:border-zinc-800/60 mb-5 relative overflow-hidden"
      >
        <div className="flex justify-between items-end mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
              <Flame size={14} className="text-orange-500" />
              <span className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Net Calories</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-extrabold tracking-tighter ${calRatio > 1.05 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                {Math.round(summary.totalCalories - burned)}
              </span>
              <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                / {calGoal}
              </span>
            </div>
          </div>
          
          {avgScore && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 mb-1">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{avgScore}</span>
            </div>
          )}
        </div>

        {/* Thick sleek bar */}
        <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(calProgress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${calRatio > 1.05 ? 'bg-rose-500' : 'bg-zinc-900 dark:bg-white'}`}
          />
        </div>

        {/* Minimal Macro Grid */}
        <div className="grid grid-cols-3 gap-5">
          <MacroStat label="Protein" current={summary.totalProtein} goal={proteinGoal} color="bg-emerald-500" />
          <MacroStat label="Carbs" current={summary.totalCarbs} goal={carbsGoal} color="bg-amber-500" />
          <MacroStat label="Fats" current={summary.totalFats} goal={fatsGoal} color="bg-blue-500" />
        </div>
      </motion.div>

      {/* Dynamic Alerts */}
      {overLimits.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-4 mb-5 border border-rose-100/50 dark:border-rose-500/20 flex gap-3 items-start">
          <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-bold text-rose-800 dark:text-rose-300 mb-1">Over Target</h4>
            <p className="text-[13px] text-rose-600 dark:text-rose-400 leading-tight">
              {overLimits.map(o => o.name).join(', ')} exceeded. Focus on hydration and light walking.
            </p>
          </div>
        </div>
      )}

      {/* AI Suggestion Minimal */}
      <div className="mb-6 px-1">
        <h3 className="text-[13px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3 items-center flex gap-2">
          <Activity size={14} className="text-indigo-500" /> Daily Insight
        </h3>
        <p className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
          {generateSuggestion(summary, user)}
        </p>
      </div>

      {/* Compact Secondary Stats (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {/* Water */}
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 mb-2 opacity-80">
            <Droplets size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Water</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">{summary.waterAmount || 0}</span>
            <span className="text-[10px] text-zinc-400 font-medium">/ 2.5L</span>
          </div>
        </div>

        {/* Burned */}
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 mb-2 opacity-80">
            <Footprints size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Burned</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">{burned}</span>
            <span className="text-[10px] text-zinc-400 font-medium">kcal</span>
          </div>
        </div>

        {/* Body Fat (Compact) */}
        {user.pbf && (
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800/60 col-span-2 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-1.5 mb-1 opacity-80">
                <Heart size={14} className="text-rose-500" />
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Body Fat</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{user.pbf}%</span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPBFCategory(user.pbf, user.gender).color.replace('text-', 'bg-').replace('500', '500/10')} ${getPBFCategory(user.pbf, user.gender).color}`}>
              {getPBFCategory(user.pbf, user.gender).label}
            </div>
          </div>
        )}
      </div>

      {/* Meals List */}
      <div>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-white">Meals Log</h2>
          {summary.meals.length > 0 && (
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {summary.meals.length} Items
            </span>
          )}
        </div>

        {summary.meals.length === 0 ? (
          <div className="text-center py-12 rounded-[24px] border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
            <Utensils size={24} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No meals logged yet.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Send a photo to the bot to start tracking!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {summary.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MacroStat({ label, current, goal, color }: { label: string, current: number, goal: number, color: string }) {
  const progress = Math.min((current / goal) * 100, 100);
  const isOver = current > goal * 1.15;
  return (
    <div>
      <div className="flex flex-col mb-1.5">
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={`text-[13px] font-bold ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {Math.round(current)}<span className="text-[10px] text-zinc-400 ml-[1px]">g</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full rounded-full ${isOver ? 'bg-rose-500' : color}`} />
      </div>
    </div>
  );
}

function generateSuggestion(summary: any, user: any) {
  if (summary.totalCalories === 0) return "Ready for today? Snap a photo of your first meal to get personalized AI insights.";

  const calRatio = summary.totalCalories / (user.dailyCalorieGoal || 2000);
  const goal = user.fitnessGoal || 'general_fitness';

  if (calRatio > 1.05) return "You've exceeded your target. Opt for a light walk and prioritize hydration for the rest of the day.";
  if (calRatio > 0.85) return "You're right on track. Finish the day strong with a protein-rich, low-carb dinner to optimize recovery.";
  if (calRatio > 0.5) return "Good progress so far. Make sure your next meal is balanced with solid protein and healthy fats.";
  if (summary.meals.length > 0) return "Off to a good start! Try to keep your upcoming meals aligned with your macro targets.";

  return "Consistency is key. Keep logging your meals accurately to build your personalized dataset.";
}
