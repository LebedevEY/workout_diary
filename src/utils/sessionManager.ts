interface SessionEntry<T> {
  data: T;
  createdAt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export class SessionManager<T> {
  private sessions = new Map<number, SessionEntry<T>>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(ttlMs: number = SESSION_TTL_MS) {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.sessions) {
        if (now - entry.createdAt > ttlMs) {
          this.sessions.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  set(userId: number, data: T): void {
    this.sessions.set(userId, { data, createdAt: Date.now() });
  }

  get(userId: number): T | undefined {
    const entry = this.sessions.get(userId);
    return entry?.data;
  }

  has(userId: number): boolean {
    return this.sessions.has(userId);
  }

  delete(userId: number): void {
    this.sessions.delete(userId);
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }
}
