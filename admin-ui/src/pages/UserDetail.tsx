import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Calendar, TrendingUp, Activity, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UserStats {
  totalWorkouts: number;
  totalSets: number;
  exerciseStats: Array<{
    name: string;
    category: string;
    total_sets: number;
    avg_weight: number;
    max_weight: number;
    avg_reps: number;
    last_performed: string;
  }>;
  recentProgress: Array<{
    date: string;
    exercises_count: number;
    total_sets: number;
  }>;
  payment: {
    startDate: string;
    paidSessions: number;
    remaining: number;
    done: number;
  } | null;
}

interface Workout {
  id: number;
  exercise_name: string;
  category: string;
  weight: number;
  reps: number;
  set_number: number;
  created_at: string;
}

interface WorkoutsResponse {
  workouts: Workout[];
  total: number;
  limit: number;
  offset: number;
}

interface ExerciseGroup {
  exerciseName: string;
  category: string;
  sets: Workout[];
}

interface GroupedWorkout {
  date: string;
  workouts: Workout[];
  exercises: ExerciseGroup[];
  exercisesCount: number;
  totalSets: number;
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${userId}/stats`).then(res => res.json()),
      fetch(`/api/users/${userId}/workouts?limit=50`).then(res => res.json())
    ])
      .then(([statsData, workoutsData]) => {
        setStats(statsData);
        setWorkouts(workoutsData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки данных:', error);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!stats || !workouts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ошибка загрузки данных</div>
      </div>
    );
  }

  const chartData = stats.recentProgress.reverse().map(item => ({
    date: format(new Date(item.date), 'dd.MM', { locale: ru }),
    упражнений: item.exercises_count,
    подходов: item.total_sets
  }));

  const groupedWorkouts: GroupedWorkout[] = workouts.workouts.reduce((acc: GroupedWorkout[], workout) => {
    const date = format(new Date(workout.created_at), 'yyyy-MM-dd');
    const existing = acc.find(g => g.date === date);
    
    if (existing) {
      existing.workouts.push(workout);
      existing.totalSets++;
      const uniqueExercises = new Set(existing.workouts.map(w => w.exercise_name));
      existing.exercisesCount = uniqueExercises.size;
    } else {
      acc.push({
        date,
        workouts: [workout],
        exercises: [],
        exercisesCount: 1,
        totalSets: 1
      });
    }
    
    return acc;
  }, []);

  groupedWorkouts.forEach(group => {
    const exerciseMap = new Map<string, ExerciseGroup>();
    
    group.workouts.forEach(workout => {
      if (!exerciseMap.has(workout.exercise_name)) {
        exerciseMap.set(workout.exercise_name, {
          exerciseName: workout.exercise_name,
          category: workout.category,
          sets: []
        });
      }
      exerciseMap.get(workout.exercise_name)!.sets.push(workout);
    });
    
    group.exercises = Array.from(exerciseMap.values());
    group.exercises.forEach(exercise => {
      exercise.sets.sort((a, b) => a.set_number - b.set_number);
    });
  });

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleExercise = (key: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedExercises(newExpanded);
  };

  return (
    <div>
      <Link to="/users" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к списку
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Пользователь #{userId}</h1>

      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Дней тренировок</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalWorkouts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Всего подходов</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSets}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Упражнений</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.exerciseStats.length}</p>
              </div>
            </div>
          </div>
        </div>

        {stats.payment && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Осталось</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.payment.remaining} / {stats.payment.paidSessions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Прогресс за последние 30 дней</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="упражнений" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="подходов" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика по упражнениям</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Упражнение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Подходов
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Средний вес
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Макс вес
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Последнее
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.exerciseStats.map((exercise, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {exercise.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exercise.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exercise.total_sets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exercise.avg_weight.toFixed(1)} кг
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exercise.max_weight} кг
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(exercise.last_performed), 'dd.MM.yyyy', { locale: ru })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">История тренировок</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Упражнений
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Подходов
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedWorkouts.map((group) => (
                <>
                  <tr 
                    key={group.date}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDate(group.date)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expandedDates.has(group.date) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(new Date(group.date), 'dd MMMM yyyy, EEEE', { locale: ru })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {group.exercisesCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {group.totalSets}
                    </td>
                  </tr>
                  {expandedDates.has(group.date) && (
                    <tr key={`${group.date}-details`}>
                      <td colSpan={4} className="px-6 py-4 bg-gray-50">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Упражнение
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Подходов
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.exercises.map((exercise) => {
                              const exerciseKey = `${group.date}-${exercise.exerciseName}`;
                              return (
                                <>
                                  <tr 
                                    key={exerciseKey}
                                    className="hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                    onClick={() => toggleExercise(exerciseKey)}
                                  >
                                    <td className="px-4 py-2 text-sm text-gray-500">
                                      {expandedExercises.has(exerciseKey) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                      {exercise.exerciseName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-500">
                                      {exercise.sets.length}
                                    </td>
                                  </tr>
                                  {expandedExercises.has(exerciseKey) && (
                                    <tr key={`${exerciseKey}-sets`}>
                                      <td colSpan={3} className="px-8 py-2 bg-white">
                                        <table className="min-w-full">
                                          <thead>
                                            <tr className="border-b border-gray-100">
                                              <th className="px-3 py-1 text-left text-xs font-medium text-gray-400">
                                                Подход
                                              </th>
                                              <th className="px-3 py-1 text-left text-xs font-medium text-gray-400">
                                                Вес
                                              </th>
                                              <th className="px-3 py-1 text-left text-xs font-medium text-gray-400">
                                                Повторения
                                              </th>
                                              <th className="px-3 py-1 text-left text-xs font-medium text-gray-400">
                                                Время
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {exercise.sets.map((set) => (
                                              <tr key={set.id} className="border-b border-gray-50 last:border-0">
                                                <td className="px-3 py-1 text-sm text-gray-600">
                                                  {set.set_number}
                                                </td>
                                                <td className="px-3 py-1 text-sm text-gray-900">
                                                  {set.weight} кг
                                                </td>
                                                <td className="px-3 py-1 text-sm text-gray-900">
                                                  {set.reps}
                                                </td>
                                                <td className="px-3 py-1 text-sm text-gray-500">
                                                  {format(new Date(set.created_at), 'HH:mm', { locale: ru })}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
