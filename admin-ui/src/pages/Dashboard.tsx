import { useEffect, useState } from 'react';
import { Users, Activity, Dumbbell, TrendingUp, Calendar } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalWorkouts: number;
  totalExercises: number;
  activeUsers: number;
  todayWorkouts: number;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-3xl font-semibold text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки статистики:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ошибка загрузки данных</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Панель управления</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Всего пользователей"
          value={stats.totalUsers}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="Активных за неделю"
          value={stats.activeUsers}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          title="Тренировок сегодня"
          value={stats.todayWorkouts}
          icon={Calendar}
          color="text-purple-600"
        />
        <StatCard
          title="Всего подходов"
          value={stats.totalWorkouts}
          icon={Activity}
          color="text-orange-600"
        />
        <StatCard
          title="Упражнений"
          value={stats.totalExercises}
          icon={Dumbbell}
          color="text-red-600"
        />
      </div>
    </div>
  );
}
