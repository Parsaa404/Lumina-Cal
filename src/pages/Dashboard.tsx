import { useAppStore } from '../store';
import { MealCard } from '../components/MealCard';
import { motion } from 'motion/react';
import { Activity, Flame, Utensils, Heart, AlertTriangle, TrendingUp, Droplets, Footprints, Star, Trophy, Zap } from 'lucide-react';

const GOAL_LABELS: Record<string, string> = {
  muscle_building: '💪 Muscle Gain',
  weight_loss: '🔥 Fat Loss',
  maintain: '⚖️ Maintain Weight',
  recomposition: '💪 Recomposition',
  healthy_lifestyle: '🥗 Healthy Lifestyle',
};

function getBMICategory(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500', bg: 'bg-blue-500' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-500' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-500', bg: 'bg-amber-500' };
  return { label: 'Obese', color: 'text-red-500', bg: 'bg-red-500' };
}

function getPBFCategory(pbf: number, gender?: string): { label: string; color: string } {
  if (gender === 'male') {
    if (pbf < 6) return { label: 'Essential', color: 'text-red-500' };
    if (pbf < 14) return { label: 'Athletic', color: 'text-blue-500' };
    if (pbf < 18) return { label: 'Fit', color: 'text-emerald-500' };
    if (pbf < 25) return { label: 'Average', color: 'text-amber-500' };
    return { label: 'Above Avg', color: 'text-red-500' };
  } else {
    if (pbf < 14) return { label: 'Essential', color: 'text-red-500' };
    if (pbf < 21) return { label: 'Athletic', color: 'text-blue-500' };
    if (pbf < 25) return { label: 'Fit', color: 'text-emerald-500' };
    if (pbf < 32) return { label: 'Average', color: 'text-amber-500' };
    return { label: 'Above Avg', color: 'text-red-500' };
  }
}

export function Dashboard() {
  const { user, summary, isLoading } = useAppStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-4"></div>
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-zinc-50 dark:bg-black">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Welcome to Cal AI</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Please start the bot in Telegram to register your account.</p>
      </div>
    );
  }

  const calGoal = user.dailyCalorieGoal || 2000;
  const calProgress = Math.min((summary.totalCalories / calGoal) * 100, 100);
  const calRatio = summary.totalCalories / calGoal;
  const proteinRatio = summary.totalProtein / (user.dailyProteinGoal || 150);
  const carbsRatio = summary.totalCarbs / (user.dailyCarbsGoal || 200);
  const fatsRatio = summary.totalFats / (user.dailyFatsGoal || 65);

  const overLimits: { name: string; percent: number }[] = [];
  if (calRatio > 1) overLimits.push({ name: 'Calories', percent: Math.round(calRatio * 100) });
  if (proteinRatio > 1.2) overLimits.push({ name: 'Protein', percent: Math.round(proteinRatio * 100) });
  if (carbsRatio > 1.2) overLimits.push({ name: 'Carbs', percent: Math.round(carbsRatio * 100) });
  if (fatsRatio > 1.2) overLimits.push({ name: 'Fats', percent: Math.round(fatsRatio * 100) });

  // Average meal score for today
  const scoredMeals = summary.meals.filter(m => m.mealScore?.overall);
  const avgScore = scoredMeals.length > 0
    ? (scoredMeals.reduce((s, m) => s + (m.mealScore?.overall || 0), 0) / scoredMeals.length).toFixed(1)
    : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-zinc-50 dark:bg-black p-4 pb-24 text-zinc-900 dark:text-zinc-100"
    >
      {/* Header */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Streak Badge */}
          {user.streak && user.streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30">
              <Zap size={14} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{user.streak}🔥</span>
            </div>
          )}
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
            {user.firstName.charAt(0)}
          </div>
        </div>
      </header>

      {/* Body Profile Card */}
      {user.bmi && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart size={18} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Body Profile</h3>
            {user.fitnessGoal && (
              <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {GOAL_LABELS[user.fitnessGoal] || user.fitnessGoal}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-3.5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">BMI</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight">{user.bmi}</span>
                <span className={`text-xs font-semibold ${getBMICategory(user.bmi).color}`}>
                  {getBMICategory(user.bmi).label}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getBMICategory(user.bmi).bg}`} style={{ width: `${Math.min((user.bmi / 40) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-3.5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Body Fat</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight">{user.pbf}%</span>
                <span className={`text-xs font-semibold ${getPBFCategory(user.pbf!, user.gender).color}`}>
                  {getPBFCategory(user.pbf!, user.gender).label}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getPBFCategory(user.pbf!, user.gender).color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(user.pbf! / (user.gender === 'male' ? 35 : 45) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Over-Limit Warning */}
      {overLimits.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-4 border border-red-200 dark:border-red-800/30">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">⚠️ Over Daily Limit</h4>
              <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                {overLimits.map(o => `${o.name} (${o.percent}%)`).join(', ')}
              </p>
              <div className="flex flex-col gap-1.5 text-xs text-red-600 dark:text-red-400">
                <span className="flex items-center gap-1.5"><Droplets size={14} /> Drink plenty of water</span>
                <span className="flex items-center gap-1.5"><Footprints size={14} /> Go for a 20-30 min walk</span>
                <span className="flex items-center gap-1.5"><TrendingUp size={14} /> Skip snacking for the rest of the day</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sugar Warning */}
      {summary.totalSugar && summary.totalSugar > 35 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-4 border border-amber-200 dark:border-amber-800/30">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ High Sugar: {Math.round(summary.totalSugar)}g / 35g</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                • Replace soda with sparkling water<br/>
                • Choose dark chocolate over milk chocolate
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Stats Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 mb-4">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Flame size={16} className="text-orange-500" /> Calories
            </p>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-bold tracking-tight ${calRatio > 1 ? 'text-red-500' : ''}`}>{Math.round(summary.totalCalories)}</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">/ {calGoal}</span>
            </div>
          </div>
          {/* Today's Meal Score */}
          {avgScore && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{avgScore}</span>
            </div>
          )}
        </div>
        
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(calProgress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${calRatio > 1 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MacroStat label="Protein" current={summary.totalProtein} goal={user.dailyProteinGoal || 150} color="bg-blue-500" />
          <MacroStat label="Carbs" current={summary.totalCarbs} goal={user.dailyCarbsGoal || 200} color="bg-emerald-500" />
          <MacroStat label="Fats" current={summary.totalFats} goal={user.dailyFatsGoal || 65} color="bg-amber-500" />
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800/30 flex gap-3">
        <div className="mt-1"><Activity size={20} className="text-indigo-500" /></div>
        <div>
          <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">AI Insight</h4>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 leading-relaxed">
            {generateSuggestion(summary, user)}
          </p>
        </div>
      </div>

      {/* Meals List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Utensils size={18} /> Meals
          </h2>
          {summary.meals.length > 0 && (
            <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {summary.meals.length} logged
            </span>
          )}
        </div>
        
        {summary.meals.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">No meals logged today.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Send a photo to the bot to log one!</p>
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
  const isOver = current > goal * 1.2;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {Math.round(current)}g
        </span>
      </div>
      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full rounded-full ${isOver ? 'bg-red-500' : color}`} />
      </div>
    </div>
  );
}

function generateSuggestion(summary: any, user: any) {
  if (summary.totalCalories === 0) return "Log your first meal to get personalized insights!";
  
  const proteinRatio = summary.totalProtein / (user.dailyProteinGoal || 150);
  const calRatio = summary.totalCalories / (user.dailyCalorieGoal || 2000);
  const goal = user.fitnessGoal || 'general_fitness';

  if (calRatio > 1.1) {
    if (goal === 'weight_loss') return "You've exceeded your calorie goal. Try a light evening walk and avoid any more snacks. Tomorrow, start with a high-protein breakfast to curb cravings.";
    if (goal === 'maintain') return "You're over your calorie target. Balance it out with lighter meals or extra activity tomorrow.";
    if (goal === 'recomposition') return "Over your calories today. Since you're recomping, focus on hitting protein and keep tomorrow's carbs lower to balance out.";
    return "You've exceeded your calorie goal. Stay hydrated and consider some light cardio.";
  }

  if (goal === 'muscle_building' || goal === 'recomposition') {
    if (proteinRatio < calRatio - 0.2) return "Your protein is falling behind your calories. Add chicken, eggs, or a protein shake to maximize muscle recovery.";
    if (calRatio < 0.5) return "You need more fuel! Aim for calorie-dense, protein-rich meals in the next few hours.";
  }

  if (goal === 'weight_loss') {
    if (calRatio > 0.8 && proteinRatio < 0.6) return "Focus on lean protein sources for remaining meals — they'll keep you full with fewer calories.";
    if (calRatio < 0.5) return "Good progress! You have room for a balanced meal. Include fiber-rich foods to stay satisfied.";
  }

  // Sugar warning
  if (summary.totalSugar && summary.totalSugar > 35) {
    return `Your sugar intake is ${Math.round(summary.totalSugar)}g — well above the 35g limit. Replace sugary drinks with water and choose whole fruits over juice.`;
  }

  if (proteinRatio < calRatio - 0.2) return "Your protein is lagging behind. Add Greek yogurt, chicken breast, or a protein shake to your next meal.";
  if (calRatio > 0.9 && proteinRatio < 0.8) return "Close to your calorie limit but low on protein. Focus on lean protein sources.";
  
  return "You're on track! Keep up the great work balancing your macros. 💪";
}
