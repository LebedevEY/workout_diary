import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, Dumbbell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import UserDetail from './pages/UserDetail';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseDetail from './pages/ExerciseDetail';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            <Link
              to="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Home className="w-5 h-5 mr-2" />
              Главная
            </Link>
            <Link
              to="/users"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/users') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Пользователи
            </Link>
            <Link
              to="/exercises"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/exercises') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Dumbbell className="w-5 h-5 mr-2" />
              Упражнения
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:userId" element={<UserDetail />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercises/:exerciseId" element={<ExerciseDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
