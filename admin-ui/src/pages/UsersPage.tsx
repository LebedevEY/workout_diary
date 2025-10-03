import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronRight, User } from 'lucide-react';

interface UserData {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  created_at: string;
  workout_days: number;
  total_sets: number;
  last_workout: string | null;
  paid_sessions: number | null;
  payment_start_date: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Ошибка загрузки пользователей:', error);
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

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Пользователи</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                to={`/users/${user.id}`}
                className="block hover:bg-gray-50 transition duration-150 ease-in-out"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <User className="h-10 w-10 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">
                          {user.first_name || user.username || `User ${user.telegram_id}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          @{user.username || 'без username'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-right mr-4">
                        <p className="text-sm text-gray-900">
                          {user.workout_days} дней • {user.total_sets} подходов
                        </p>
                        <p className="text-sm text-gray-500">
                          {user.last_workout 
                            ? `Последняя: ${format(new Date(user.last_workout), 'dd MMM yyyy', { locale: ru })}`
                            : 'Нет тренировок'
                          }
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
