import { MealLog } from '../../shared/types';
import { format } from 'date-fns';

export function MealCard({ meal }: { meal: MealLog }) {
  const score = meal.mealScore?.overall;
  
  return (
    <div className="bg-white dark:bg-[#121212] rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none border border-zinc-100/80 dark:border-zinc-800/60 transition-transform active:scale-[0.98]">
      <div className="flex gap-4 items-start">
        {meal.photoUrl ? (
          <img 
            src={meal.photoUrl} 
            alt={meal.description} 
            className="w-16 h-16 rounded-[18px] object-cover bg-zinc-50 dark:bg-zinc-800/50 shadow-inner mt-0.5"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-[18px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-2xl mt-0.5 border border-zinc-200/50 dark:border-zinc-700/30">
            🍽️
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="font-semibold text-[15px] text-zinc-900 dark:text-white leading-tight line-clamp-2">
              {meal.description}
            </h3>
            {score && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                score >= 8 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                score >= 6 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}>
                ★ {score}
              </span>
            )}
          </div>
          
          <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-2">
            {format(new Date(meal.loggedAt), 'h:mm a')}
          </p>
          
          <div className="flex gap-3 text-[11px] font-bold tracking-wide">
            <span className="text-zinc-900 dark:text-white">{meal.nutrition.calories} <span className="text-zinc-400 font-medium ml-0.5">kcal</span></span>
            <span className="text-emerald-500">{meal.nutrition.protein}<span className="text-emerald-500/50 ml-0.5">P</span></span>
            <span className="text-amber-500">{meal.nutrition.carbs}<span className="text-amber-500/50 ml-0.5">C</span></span>
            <span className="text-blue-500">{meal.nutrition.fats}<span className="text-blue-500/50 ml-0.5">F</span></span>
          </div>
        </div>
      </div>
      
      {/* AI Feedback */}
      {meal.aiFeedback && (
        <div className="mt-3.5 pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800/80">
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            <span className="opacity-80 mr-1.5">✨</span> {meal.aiFeedback}
          </p>
        </div>
      )}
    </div>
  );
}
