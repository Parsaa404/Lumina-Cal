import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface NutritionChartProps {
  protein: number;
  carbs: number;
  fats: number;
  proteinGoal: number;
  carbsGoal: number;
  fatsGoal: number;
}

export function NutritionChart({ protein, carbs, fats, proteinGoal, carbsGoal, fatsGoal }: NutritionChartProps) {
  const data = [
    { name: 'Protein', value: protein, color: '#3b82f6' }, // blue-500
    { name: 'Carbs', value: carbs, color: '#10b981' }, // emerald-500
    { name: 'Fats', value: fats, color: '#f59e0b' }, // amber-500
  ];

  return (
    <div className="w-full h-48 flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-sm text-gray-500 font-medium">Macros</span>
      </div>
    </div>
  );
}
