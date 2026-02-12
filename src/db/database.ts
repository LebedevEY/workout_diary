import Database from 'better-sqlite3';

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
    return result?.id ?? null;
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

  updateExercise(id: number, name: string, category: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE exercises SET name = ?, category = ? WHERE id = ?
    `);
    const result = stmt.run(name, category, id);
    return result.changes > 0;
  }

  getExerciseById(id: number): { id: number; name: string; category: string } | null {
    const stmt = this.db.prepare('SELECT id, name, category FROM exercises WHERE id = ?');
    const result = stmt.get(id) as { id: number; name: string; category: string } | undefined;
    return result || null;
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

  getLastWorkout(userId: number): { id: number; exercise_name: string; weight: number; reps: number; set_number: number; created_at: string } | null {
    const stmt = this.db.prepare(`
      SELECT w.id, e.name as exercise_name, w.weight, w.reps,
             COALESCE(w.set_number, 1) as set_number, w.created_at
      FROM workouts w
      JOIN exercises e ON w.exercise_id = e.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(userId) as { id: number; exercise_name: string; weight: number; reps: number; set_number: number; created_at: string } | undefined;
    return row ?? null;
  }

  deleteWorkout(workoutId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM workouts WHERE id = ?');
    const result = stmt.run(workoutId);
    return result.changes > 0;
  }

  getStats(): {
    totalUsers: number;
    totalWorkouts: number;
    totalExercises: number;
    activeUsers: number;
    todayWorkouts: number;
  } {
    const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalWorkouts = this.db.prepare('SELECT COUNT(*) as count FROM workouts').get() as { count: number };
    const totalExercises = this.db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };
    const activeUsers = this.db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM workouts
      WHERE DATE(created_at) >= DATE('now', '-7 days')
    `).get() as { count: number };
    const todayWorkouts = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM workouts
      WHERE DATE(created_at) = DATE('now')
    `).get() as { count: number };
    return {
      totalUsers: totalUsers.count,
      totalWorkouts: totalWorkouts.count,
      totalExercises: totalExercises.count,
      activeUsers: activeUsers.count,
      todayWorkouts: todayWorkouts.count,
    };
  }

  getUsers(): Array<{
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
  }> {
    const stmt = this.db.prepare(`
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
    `);
    return stmt.all() as Array<{
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
    }>;
  }

  getUserWorkouts(userId: number, limit: number, offset: number): {
    workouts: Array<{
      id: number;
      exercise_name: string;
      category: string;
      weight: number;
      reps: number;
      set_number: number;
      created_at: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  } {
    const workouts = this.db.prepare(`
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
    `).all(userId, limit, offset) as Array<{
      id: number;
      exercise_name: string;
      category: string;
      weight: number;
      reps: number;
      set_number: number;
      created_at: string;
    }>;
    const total = this.db.prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?'
    ).get(userId) as { count: number };
    return { workouts, total: total.count, limit, offset };
  }

  getUserStats(userId: number): {
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
  } {
    const totalWorkouts = this.db.prepare(
      'SELECT COUNT(DISTINCT DATE(created_at)) as count FROM workouts WHERE user_id = ?'
    ).get(userId) as { count: number };
    const totalSets = this.db.prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?'
    ).get(userId) as { count: number };
    const exerciseStats = this.db.prepare(`
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
    `).all(userId) as Array<{
      name: string;
      category: string;
      total_sets: number;
      avg_weight: number;
      max_weight: number;
      avg_reps: number;
      last_performed: string;
    }>;
    const recentProgress = this.db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT exercise_id) as exercises_count,
        COUNT(*) as total_sets
      FROM workouts
      WHERE user_id = ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).all(userId) as Array<{
      date: string;
      exercises_count: number;
      total_sets: number;
    }>;
    const payment = this.getPayment(userId);
    let paymentInfo: { startDate: string; paidSessions: number; remaining: number; done: number } | null = null;
    if (payment) {
      const remaining = this.getRemainingSessions(userId);
      paymentInfo = {
        startDate: payment.start_date,
        paidSessions: payment.paid_sessions,
        remaining: remaining?.remaining ?? 0,
        done: remaining?.done ?? 0,
      };
    }
    return {
      totalWorkouts: totalWorkouts.count,
      totalSets: totalSets.count,
      exerciseStats,
      recentProgress,
      payment: paymentInfo,
    };
  }

  getExerciseStats(exerciseId: number): {
    exercise: { id: number; name: string; category: string } | null;
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
  } {
    const exercise = this.db.prepare(
      'SELECT id, name, category FROM exercises WHERE id = ?'
    ).get(exerciseId) as { id: number; name: string; category: string } | undefined;
    const totalSets = this.db.prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE exercise_id = ?'
    ).get(exerciseId) as { count: number };
    const userStats = this.db.prepare(`
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
    `).all(exerciseId) as Array<{
      id: number;
      username: string | null;
      first_name: string | null;
      total_sets: number;
      avg_weight: number;
      max_weight: number;
      last_performed: string;
    }>;
    const progressData = this.db.prepare(`
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
    `).all(exerciseId) as Array<{
      date: string;
      avg_weight: number;
      max_weight: number;
      sets_count: number;
    }>;
    return {
      exercise: exercise ?? null,
      totalSets: totalSets.count,
      userStats,
      progressData,
    };
  }

  close(): void {
    this.db.close();
  }
}
