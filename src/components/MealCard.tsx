import { MealLog } from '../../shared/types';
import { format } from 'date-fns';

export function MealCard({ meal }: { meal: MealLog }) {
  const score = meal.mealScore?.overall;
  
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
      <div className="flex gap-4 items-center">
        {meal.photoUrl ? (
          <img 
            src={meal.photoUrl} 
            alt={meal.description} 
            className="w-16 h-16 rounded-xl object-cover bg-zinc-100 dark:bg-zinc-800"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">
            🍽️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 flex-1">
              {meal.description}
            </h3>
            {score && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                score >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                ⭐ {score}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {format(new Date(meal.loggedAt), 'h:mm a')}
          </p>
          <div className="flex gap-3 mt-2 text-xs font-medium">
            <span className="text-zinc-700 dark:text-zinc-300">{meal.nutrition.calories} kcal</span>
            <span className="text-blue-500">{meal.nutrition.protein}g P</span>
            <span className="text-emerald-500">{meal.nutrition.carbs}g C</span>
            <span className="text-amber-500">{meal.nutrition.fats}g F</span>
          </div>
        </div>
      </div>
      {/* AI Feedback */}
      {meal.aiFeedback && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            💡 {meal.aiFeedback}
          </p>
        </div>
      )}
    </div>
  );
}
