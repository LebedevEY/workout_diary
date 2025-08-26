import cron from 'node-cron'
import { Bot } from 'grammy'
import { WorkoutDatabase } from '../db/database'

function todayYMD(tz: string): string {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = fmt.formatToParts(now)
  const y = parts.find(p => p.type === 'year')?.value || '1970'
  const m = parts.find(p => p.type === 'month')?.value || '01'
  const d = parts.find(p => p.type === 'day')?.value || '01'
  return `${y}-${m}-${d}`
}

export function setupScheduler(bot: Bot, db: WorkoutDatabase) {
  const tz = process.env.TZ || 'Europe/Moscow'
  cron.schedule('0 20 * * *', async () => {
    try {
      const payments = db.getAllActivePaymentsWithTelegram()
      for (const p of payments) {
        const done = db.countWorkoutDaysSince(p.user_id, p.start_date)
        if (done >= p.paid_sessions) {
          const last = p.last_notified_at ? p.last_notified_at.split('T')[0] : null
          const today = todayYMD(tz)
          if (last !== today) {
            const remaining = 0
            await bot.api.sendMessage(
              p.telegram_id,
              `Напоминание: с ${p.start_date} прошло тренировок: ${done}. Оплачено: ${p.paid_sessions}. Осталось: ${remaining}. Обновите оплату командой /pay`
            )
            db.updateLastNotified(p.user_id)
          }
        }
      }
    } catch (e) {
      console.error('Ошибка в cron-задаче оплаты:', e)
    }
  }, { timezone: tz })
}
