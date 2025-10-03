import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Dumbbell, Plus, X, Save } from 'lucide-react';

interface Exercise {
  id: number;
  name: string;
  category: string;
  created_at: string;
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = () => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        setExercises(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки упражнений:', error);
        setLoading(false);
      });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setNewName('');
    setNewCategory('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewName('');
    setNewCategory('');
  };

  const handleSave = async () => {
    if (!newName.trim() || !newCategory.trim()) {
      alert('Название и категория не могут быть пустыми');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory.trim(),
        }),
      });

      if (response.ok) {
        await loadExercises();
        setIsAdding(false);
        setNewName('');
        setNewCategory('');
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

  const groupedExercises = exercises.reduce((acc, exercise) => {
    const category = exercise.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Упражнения</h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить упражнение
        </button>
      </div>

      {isAdding && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Новое упражнение</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название упражнения
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Категория (например: Грудь, Ноги, Спина)"
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
      )}
      
      <div className="space-y-6">
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">{category}</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {categoryExercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link
                      to={`/exercises/${exercise.id}`}
                      className="block hover:bg-gray-50 transition duration-150 ease-in-out"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <Dumbbell className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-blue-600">
                                {exercise.name}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
