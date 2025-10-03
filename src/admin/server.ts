import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { WorkoutDatabase } from '../db/database.js';

export class AdminServer {
  private app: express.Application;
  private db: WorkoutDatabase;
  private port: number;

  constructor(db: WorkoutDatabase, port: number = 3000) {
    this.app = express();
    this.db = db;
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    const distPath = path.join(process.cwd(), 'admin-ui/dist');
    const fs = require('fs');
    if (fs.existsSync(distPath)) {
      this.app.use(express.static(distPath));
    }
  }

  private setupRoutes(): void {
    this.app.get('/api/stats', (req: Request, res: Response) => {
      try {
        const stats = this.getStats();
        res.json(stats);
      } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/users', (req: Request, res: Response) => {
      try {
        const users = this.getUsers();
        res.json(users);
      } catch (error) {
        console.error('Ошибка при получении пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/users/:userId/workouts', (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const workouts = this.getUserWorkouts(userId, limit, offset);
        res.json(workouts);
      } catch (error) {
        console.error('Ошибка при получении тренировок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/users/:userId/stats', (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const stats = this.getUserStats(userId);
        res.json(stats);
      } catch (error) {
        console.error('Ошибка при получении статистики пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/exercises', (req: Request, res: Response) => {
      try {
        const exercises = this.db.getExercises();
        res.json(exercises);
      } catch (error) {
        console.error('Ошибка при получении упражнений:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/exercises/:exerciseId/stats', (req: Request, res: Response) => {
      try {
        const exerciseId = parseInt(req.params.exerciseId);
        const stats = this.getExerciseStats(exerciseId);
        res.json(stats);
      } catch (error) {
        console.error('Ошибка при получении статистики упражнения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.post('/api/exercises', (req: Request, res: Response) => {
      try {
        const { name, category } = req.body;

        if (!name || !category) {
          res.status(400).json({ error: 'Название и категория обязательны' });
          return;
        }

        if (this.db.exerciseExists(name)) {
          res.status(409).json({ error: 'Упражнение с таким названием уже существует' });
          return;
        }

        const exerciseId = this.db.createExercise(name, category);
        res.status(201).json({ success: true, exercise: { id: exerciseId, name, category } });
      } catch (error) {
        console.error('Ошибка при создании упражнения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.put('/api/exercises/:exerciseId', (req: Request, res: Response) => {
      try {
        const exerciseId = parseInt(req.params.exerciseId);
        const { name, category } = req.body;

        if (!name || !category) {
          res.status(400).json({ error: 'Название и категория обязательны' });
          return;
        }

        const exercise = this.db.getExerciseById(exerciseId);
        if (!exercise) {
          res.status(404).json({ error: 'Упражнение не найдено' });
          return;
        }

        const updated = this.db.updateExercise(exerciseId, name, category);
        if (updated) {
          res.json({ success: true, exercise: { id: exerciseId, name, category } });
        } else {
          res.status(500).json({ error: 'Не удалось обновить упражнение' });
        }
      } catch (error) {
        console.error('Ошибка при обновлении упражнения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(process.cwd(), 'admin-ui/dist/index.html');
      const fs = require('fs');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ 
          error: 'Frontend не собран',
          message: 'Запустите "yarn admin:build" для сборки frontend или используйте "yarn admin:dev" для разработки'
        });
      }
    });
  }

  private getStats(): Record<string, unknown> {
    const db = (this.db as unknown as { db: { prepare: (sql: string) => { get: () => unknown } } }).db;
    
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalWorkouts = db.prepare('SELECT COUNT(*) as count FROM workouts').get() as { count: number };
    const totalExercises = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };
    
    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM workouts 
      WHERE DATE(created_at) >= DATE('now', '-7 days')
    `).get() as { count: number };

    const todayWorkouts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM workouts 
      WHERE DATE(created_at) = DATE('now')
    `).get() as { count: number };

    return {
      totalUsers: totalUsers.count,
      totalWorkouts: totalWorkouts.count,
      totalExercises: totalExercises.count,
      activeUsers: activeUsers.count,
      todayWorkouts: todayWorkouts.count
    };
  }

  private getUsers(): Array<Record<string, unknown>> {
    const db = (this.db as unknown as { db: { prepare: (sql: string) => { all: () => unknown } } }).db;
    
    const users = db.prepare(`
      SELECT 
        u.id,
        u.telegram_id,
        u.username,
        u.first_name,
        u.created_at,
        COUNT(DISTINCT DATE(w.created_at)) as workout_days,
        COUNT(w.id) as total_sets,
        MAX(w.created_at) as last_workout,
        p.paid_sessions,
        p.start_date as payment_start_date
      FROM users u
      LEFT JOIN workouts w ON u.id = w.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      GROUP BY u.id
      ORDER BY last_workout DESC
    `).all();

    return users as Array<Record<string, unknown>>;
  }

  private getUserWorkouts(userId: number, limit: number, offset: number): Record<string, unknown> {
    const db = (this.db as unknown as { db: { prepare: (sql: string) => { all: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown } } }).db;
    
    const workouts = db.prepare(`
      SELECT 
        w.id,
        e.name as exercise_name,
        e.category,
        w.weight,
        w.reps,
        w.set_number,
        w.created_at
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM workouts WHERE user_id = ?
    `).get(userId) as { count: number };

    return {
      workouts,
      total: total.count,
      limit,
      offset
    };
  }

  private getUserStats(userId: number): Record<string, unknown> {
    const db = (this.db as unknown as { db: { prepare: (sql: string) => { all: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown } } }).db;
    
    const totalWorkouts = db.prepare(`
      SELECT COUNT(DISTINCT DATE(created_at)) as count FROM workouts WHERE user_id = ?
    `).get(userId) as { count: number };

    const totalSets = db.prepare(`
      SELECT COUNT(*) as count FROM workouts WHERE user_id = ?
    `).get(userId) as { count: number };

    const exerciseStats = db.prepare(`
      SELECT 
        e.name,
        e.category,
        COUNT(*) as total_sets,
        AVG(w.weight) as avg_weight,
        MAX(w.weight) as max_weight,
        AVG(w.reps) as avg_reps,
        MAX(w.created_at) as last_performed
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ?
      GROUP BY e.id
      ORDER BY total_sets DESC
    `).all(userId);

    const recentProgress = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT exercise_id) as exercises_count,
        COUNT(*) as total_sets
      FROM workouts
      WHERE user_id = ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).all(userId);

    const payment = this.db.getPayment(userId);
    let paymentInfo = null;
    if (payment) {
      const remaining = this.db.getRemainingSessions(userId);
      paymentInfo = {
        startDate: payment.start_date,
        paidSessions: payment.paid_sessions,
        remaining: remaining?.remaining || 0,
        done: remaining?.done || 0
      };
    }

    return {
      totalWorkouts: totalWorkouts.count,
      totalSets: totalSets.count,
      exerciseStats,
      recentProgress,
      payment: paymentInfo
    };
  }

  private getExerciseStats(exerciseId: number): Record<string, unknown> {
    const db = (this.db as unknown as { db: { prepare: (sql: string) => { all: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown } } }).db;
    
    const exercise = db.prepare(`
      SELECT * FROM exercises WHERE id = ?
    `).get(exerciseId);

    const totalSets = db.prepare(`
      SELECT COUNT(*) as count FROM workouts WHERE exercise_id = ?
    `).get(exerciseId) as { count: number };

    const userStats = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        COUNT(*) as total_sets,
        AVG(w.weight) as avg_weight,
        MAX(w.weight) as max_weight,
        MAX(w.created_at) as last_performed
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.exercise_id = ?
      GROUP BY u.id
      ORDER BY total_sets DESC
    `).all(exerciseId);

    const progressData = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        AVG(weight) as avg_weight,
        MAX(weight) as max_weight,
        COUNT(*) as sets_count
      FROM workouts
      WHERE exercise_id = ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 90
    `).all(exerciseId);

    return {
      exercise,
      totalSets: totalSets.count,
      userStats,
      progressData
    };
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Админ-панель доступна на http://localhost:${this.port}`);
    });
  }
}
