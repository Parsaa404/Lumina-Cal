import { useEffect } from 'react';
import { useAppStore } from './store';
import { getTelegramData, isTelegramWebApp } from './lib/telegram';
import { Dashboard } from './pages/Dashboard';

export default function App() {
  const { fetchData, isLoading } = useAppStore();

  useEffect(() => {
    if (isTelegramWebApp()) {
      const tgData = getTelegramData();
      if (tgData) {
        tgData.expand();
        tgData.ready();
        
        // Use initData for auth
        fetchData(tgData.initData);
      }
    } else {
      // Mock data for local testing outside Telegram
      useAppStore.setState({
        user: {
          id: '1',
          telegramId: 12345,
          firstName: 'John',
          gender: 'male',
          height: 178,
          weight: 75,
          age: 25,
          bmi: 23.7,
          pbf: 16.2,
          fitnessGoal: 'muscle_building',
          streak: 5,
          lastLogDate: new Date().toISOString().split('T')[0],
          targetWeight: 80,
          dailyCalorieGoal: 2800,
          dailyProteinGoal: 180,
          dailyCarbsGoal: 300,
          dailyFatsGoal: 80,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        summary: {
          date: new Date().toISOString().split('T')[0],
          totalCalories: 1850,
          totalProtein: 125,
          totalCarbs: 180,
          totalFats: 55,
          totalSugar: 28,
          totalSodium: 1800,
          meals: [
            {
              id: 'm1',
              userId: '1',
              description: 'Grilled Chicken Salad with Olive Oil',
              nutrition: {
                calories: 450,
                protein: 45,
                carbs: 15,
                fats: 22,
                fiber: 6,
                sugar: 3,
                sodium: 580
              },
              mealScore: { overall: 8.5, pros: ['High protein', 'Good fiber'], cons: ['Slightly high sodium'] },
              aiFeedback: 'Great protein choice! Consider using lemon dressing instead of olive oil to cut 50 calories.',
              loggedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
              cuisineType: 'Healthy',
              confidenceScore: 95
            },
            {
              id: 'm2',
              userId: '1',
              description: 'Oatmeal with Berries and Almonds',
              nutrition: {
                calories: 350,
                protein: 12,
                carbs: 55,
                fats: 12,
                fiber: 8,
                sugar: 14,
                sodium: 120
              },
              mealScore: { overall: 9.0, pros: ['Excellent fiber', 'Low sugar', 'Whole grains'], cons: [] },
              aiFeedback: 'Perfect breakfast choice! Add a scoop of protein powder to boost muscle recovery.',
              loggedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
              cuisineType: 'Breakfast',
              confidenceScore: 92
            },
            {
              id: 'm3',
              userId: '1',
              description: 'Rice Bowl with Teriyaki Chicken',
              nutrition: {
                calories: 650,
                protein: 35,
                carbs: 85,
                fats: 18,
                fiber: 3,
                sugar: 11,
                sodium: 1100
              },
              mealScore: { overall: 6.5, pros: ['Decent protein'], cons: ['High sodium', 'Low fiber', 'Refined carbs'] },
              aiFeedback: 'Switch to brown rice for extra fiber. Use low-sodium soy sauce to cut sodium by 40%.',
              loggedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
              cuisineType: 'Asian',
              confidenceScore: 88
            }
          ]
        },
        isLoading: false
      });
    }
  }, [fetchData]);

  if (isLoading && isTelegramWebApp()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-4"></div>
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
