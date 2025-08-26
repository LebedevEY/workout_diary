import Database from 'better-sqlite3';
import path from 'path';

export class WorkoutDatabase {
  private db: Database.Database;

  constructor(dbPath: string = 'workout.db') {
    this.db = new Database(dbPath);
    this.initTables();
    this.runMigrations();
    this.seedExercises();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      );

      CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts (user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_workouts_user_exercise ON workouts (user_id, exercise_id);

      CREATE TABLE IF NOT EXISTS payments (
        user_id INTEGER PRIMARY KEY,
        start_date TEXT NOT NULL,
        paid_sessions INTEGER NOT NULL,
        last_notified_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
    `);
  }

  private runMigrations(): void {
    const tableInfo = this.db.prepare("PRAGMA table_info(workouts)").all() as Array<{name: string}>;
    const hasSetNumber = tableInfo.some(column => column.name === 'set_number');
    
    if (!hasSetNumber) {
      console.log('Выполнение миграции: добавление столбца set_number...');
      this.db.exec(`
        ALTER TABLE workouts ADD COLUMN set_number INTEGER DEFAULT 1;
        UPDATE workouts SET set_number = 1 WHERE set_number IS NULL OR set_number = 0;
      `);
      console.log('Миграция завершена успешно.');
    } else {
      this.db.exec(`UPDATE workouts SET set_number = 1 WHERE set_number IS NULL OR set_number = 0;`);
    }
  }

  private seedExercises(): void {
    const exercises = [
      { name: 'Жим лежа', category: 'Грудь' },
      { name: 'Жим с паузами', category: 'Грудь' },
      { name: 'Присед', category: 'Ноги' },
      { name: 'Тяга гантелей', category: 'Спина' },
      { name: 'Тяга блока', category: 'Спина' },
      { name: 'Трицепс', category: 'Руки' },
      { name: 'Бицепс', category: 'Руки' }
    ];

    const insertExercise = this.db.prepare(`
      INSERT OR IGNORE INTO exercises (name, category) VALUES (?, ?)
    `);

    exercises.forEach(exercise => {
      insertExercise.run(exercise.name, exercise.category);
    });
  }

  createUser(telegramId: number, username?: string, firstName?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO users (telegram_id, username, first_name) 
      VALUES (?, ?, ?)
    `);
    stmt.run(telegramId, username, firstName);
  }

  getUserId(telegramId: number): number | null {
    const stmt = this.db.prepare('SELECT id FROM users WHERE telegram_id = ?');
    const result = stmt.get(telegramId) as { id: number } | undefined;
    return result?.id || null;
  }

  getExercises(): Array<{ id: number; name: string; category: string }> {
    const stmt = this.db.prepare('SELECT id, name, category FROM exercises ORDER BY category, name');
    return stmt.all() as Array<{ id: number; name: string; category: string }>;
  }

  createExercise(name: string, category: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO exercises (name, category) VALUES (?, ?)
    `);
    const result = stmt.run(name, category);
    return result.lastInsertRowid as number;
  }

  exerciseExists(name: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM exercises WHERE name = ?');
    const result = stmt.get(name) as { count: number };
    return result.count > 0;
  }

  addWorkout(userId: number, exerciseId: number, weight: number, reps: number, setNumber: number = 1): void {
    const stmt = this.db.prepare(`
      INSERT INTO workouts (user_id, exercise_id, weight, reps, set_number) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, exerciseId, weight, reps, setNumber);
  }

  getNextSetNumber(userId: number, exerciseId: number, date: string): number {
    const stmt = this.db.prepare(`
      SELECT MAX(set_number) as max_set
      FROM workouts 
      WHERE user_id = ? AND exercise_id = ? AND DATE(created_at) = ?
    `);
    const result = stmt.get(userId, exerciseId, date) as { max_set: number | null };
    return (result?.max_set || 0) + 1;
  }

  getTodaysExercises(userId: number): Array<{
    id: number;
    name: string;
    last_weight: number;
    last_reps: number;
    set_count: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare(`
      SELECT 
        e.id,
        e.name,
        w.weight as last_weight,
        w.reps as last_reps,
        COUNT(*) as set_count
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ? AND DATE(w.created_at) = ?
      GROUP BY e.id, e.name
      ORDER BY MAX(w.created_at) DESC
    `);
    return stmt.all(userId, today) as Array<{
      id: number;
      name: string;
      last_weight: number;
      last_reps: number;
      set_count: number;
    }>;
  }

  getWorkoutsByDate(userId: number, date: string): Array<{
    exercise_name: string;
    weight: number;
    reps: number;
    set_number: number;
    created_at: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT e.name as exercise_name, w.weight, w.reps, 
             COALESCE(w.set_number, 1) as set_number, w.created_at
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ? AND DATE(w.created_at) = ?
      ORDER BY w.created_at DESC, COALESCE(w.set_number, 1) ASC
    `);
    return stmt.all(userId, date) as Array<{
      exercise_name: string;
      weight: number;
      reps: number;
      set_number: number;
      created_at: string;
    }>;
  }

  getWorkoutsByPeriod(userId: number, startDate: string, endDate: string): Array<{
    exercise_name: string;
    weight: number;
    reps: number;
    set_number: number;
    created_at: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT e.name as exercise_name, w.weight, w.reps, 
             COALESCE(w.set_number, 1) as set_number, w.created_at
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ? AND DATE(w.created_at) BETWEEN ? AND ?
      ORDER BY w.created_at DESC, COALESCE(w.set_number, 1) ASC
    `);
    return stmt.all(userId, startDate, endDate) as Array<{
      exercise_name: string;
      weight: number;
      reps: number;
      set_number: number;
      created_at: string;
    }>;
  }

  upsertPayment(userId: number, startDate: string, paidSessions: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO payments (user_id, start_date, paid_sessions, last_notified_at)
      VALUES (?, ?, ?, NULL)
      ON CONFLICT(user_id) DO UPDATE SET
        start_date=excluded.start_date,
        paid_sessions=excluded.paid_sessions,
        last_notified_at=NULL
    `);
    stmt.run(userId, startDate, paidSessions);
  }

  getPayment(userId: number): { user_id: number; start_date: string; paid_sessions: number; last_notified_at: string | null } | null {
    const stmt = this.db.prepare(`
      SELECT user_id, start_date, paid_sessions, last_notified_at
      FROM payments
      WHERE user_id = ?
    `);
    const row = stmt.get(userId) as { user_id: number; start_date: string; paid_sessions: number; last_notified_at: string | null } | undefined;
    return row || null;
  }

  countWorkoutDaysSince(userId: number, startDate: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT DATE(created_at)) as cnt
      FROM workouts
      WHERE user_id = ? AND DATE(created_at) >= ?
    `);
    const row = stmt.get(userId, startDate) as { cnt: number };
    return row.cnt || 0;
  }

  getRemainingSessions(userId: number): { remaining: number; done: number; paid: number; start_date: string } | null {
    const payment = this.getPayment(userId);
    if (!payment) return null;
    const done = this.countWorkoutDaysSince(userId, payment.start_date);
    const remaining = payment.paid_sessions - done;
    return { remaining, done, paid: payment.paid_sessions, start_date: payment.start_date };
  }

  updateLastNotified(userId: number): void {
    const stmt = this.db.prepare(`
      UPDATE payments SET last_notified_at = CURRENT_TIMESTAMP WHERE user_id = ?
    `);
    stmt.run(userId);
  }

  getAllActivePaymentsWithTelegram(): Array<{ user_id: number; telegram_id: number; start_date: string; paid_sessions: number; last_notified_at: string | null }> {
    const stmt = this.db.prepare(`
      SELECT p.user_id, u.telegram_id, p.start_date, p.paid_sessions, p.last_notified_at
      FROM payments p
      JOIN users u ON u.id = p.user_id
    `);
    return stmt.all() as Array<{ user_id: number; telegram_id: number; start_date: string; paid_sessions: number; last_notified_at: string | null }>;
  }

  getTelegramIdByUserId(userId: number): number | null {
    const stmt = this.db.prepare('SELECT telegram_id FROM users WHERE id = ?');
    const row = stmt.get(userId) as { telegram_id: number } | undefined;
    return row?.telegram_id ?? null;
  }

  close(): void {
    this.db.close();
  }
}
