import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Activity, Users, TrendingUp, Edit2, Save, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExerciseStats {
  exercise: {
    id: number;
    name: string;
    category: string;
  };
  totalSets: number;
  userStats: Array<{
    id: number;
    username: string | null;
    first_name: string | null;
    total_sets: number;
    avg_weight: number;
    max_weight: number;
    last_performed: string;
  }>;
  progressData: Array<{
    date: string;
    avg_weight: number;
    max_weight: number;
    sets_count: number;
  }>;
}

export default function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [exerciseId]);

  const loadData = () => {
    fetch(`/api/exercises/${exerciseId}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setEditName(data.exercise.name);
        setEditCategory(data.exercise.category);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки данных:', error);
        setLoading(false);
      });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (stats) {
      setEditName(stats.exercise.name);
      setEditCategory(stats.exercise.category);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editCategory.trim()) {
      alert('Название и категория не могут быть пустыми');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
        }),
      });

      if (response.ok) {
        await loadData();
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert('Ошибка при сохранении данных');
    } finally {
      setSaving(false);
    }
  };

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

  const chartData = stats.progressData.reverse().map(item => ({
    date: format(new Date(item.date), 'dd.MM', { locale: ru }),
    'Средний вес': item.avg_weight,
    'Макс вес': item.max_weight,
    'Подходов': item.sets_count
  }));

  return (
    <div>
      <Link to="/exercises" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к списку
      </Link>

      <div className="mb-8">
        {isEditing ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название упражнения
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Название упражнения"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Категория"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{stats.exercise.name}</h1>
              <p className="text-gray-500 mt-2">{stats.exercise.category}</p>
            </div>
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Редактировать
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-600" />
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
              <Users className="h-6 w-6 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Пользователей</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.userStats.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Макс вес</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.max(...stats.userStats.map(u => u.max_weight))} кг
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Прогресс за последние 90 дней</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Средний вес" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="Макс вес" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика по пользователям</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
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
              {stats.userStats.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/users/${user.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {user.first_name || user.username || `User ${user.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.total_sets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.avg_weight.toFixed(1)} кг
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.max_weight} кг
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.last_performed), 'dd.MM.yyyy', { locale: ru })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
