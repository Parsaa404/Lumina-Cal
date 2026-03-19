import { create } from 'zustand';
import { User, DailySummary, MealLog } from '../shared/types';

interface AppState {
  user: User | null;
  summary: DailySummary | null;
  isLoading: boolean;
  currentDate: string;
  setUser: (user: User) => void;
  setSummary: (summary: DailySummary) => void;
  setCurrentDate: (date: string) => void;
  addMeal: (meal: MealLog) => void;
  fetchData: (initData: string) => Promise<void>;
  fetchSummaryForDate: (date: string, initData: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  summary: null,
  isLoading: true,
  currentDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
  setUser: (user) => set({ user }),
  setSummary: (summary) => set({ summary }),
  setCurrentDate: (date) => set({ currentDate: date }),
  addMeal: (meal) => set((state) => {
    if (!state.summary) return state;
    return {
      summary: {
        ...state.summary,
        totalCalories: state.summary.totalCalories + meal.nutrition.calories,
        totalProtein: state.summary.totalProtein + meal.nutrition.protein,
        totalCarbs: state.summary.totalCarbs + meal.nutrition.carbs,
        totalFats: state.summary.totalFats + meal.nutrition.fats,
        meals: [...state.summary.meals, meal],
      }
    };
  }),
  fetchData: async (initData: string) => {
    set({ isLoading: true });
    try {
      const headers = { 'x-telegram-init-data': initData };
      
      // Fix timezone bug: request the local date instead of defaulting to UTC on server
      const tzOffset = new Date().getTimezoneOffset() * 60000;
      const localDate = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

      const [userRes, summaryRes] = await Promise.all([
        fetch('/api/user', { headers }),
        fetch(`/api/summary?date=${localDate}`, { headers })
      ]);

      if (userRes.ok && summaryRes.ok) {
        const user = await userRes.json();
        const summary = await summaryRes.json();
        set({ user, summary, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ isLoading: false });
    }
  },
  fetchSummaryForDate: async (date: string, initData: string) => {
    set({ isLoading: true, currentDate: date });
    try {
      const headers = { 'x-telegram-init-data': initData };
      const res = await fetch(`/api/summary?date=${date}`, { headers });
      
      if (res.ok) {
        const summary = await res.json();
        set({ summary, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      set({ isLoading: false });
    }
  }
}));
