import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
    if (fs.existsSync(distPath)) {
      this.app.use(express.static(distPath));
    }
  }

  private setupRoutes(): void {
    this.app.get('/api/stats', (_req: Request, res: Response) => {
      try {
        const stats = this.db.getStats();
        res.json(stats);
      } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/users', (_req: Request, res: Response) => {
      try {
        const users = this.db.getUsers();
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
        const workouts = this.db.getUserWorkouts(userId, limit, offset);
        res.json(workouts);
      } catch (error) {
        console.error('Ошибка при получении тренировок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/users/:userId/stats', (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const stats = this.db.getUserStats(userId);
        res.json(stats);
      } catch (error) {
        console.error('Ошибка при получении статистики пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    this.app.get('/api/exercises', (_req: Request, res: Response) => {
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
        const stats = this.db.getExerciseStats(exerciseId);
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

    this.app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(process.cwd(), 'admin-ui/dist/index.html');

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: 'Frontend не собран',
          message: 'Запустите "yarn admin:build" для сборки frontend или используйте "yarn admin:dev" для разработки',
        });
      }
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Админ-панель доступна на http://localhost:${this.port}`);
    });
  }
}
