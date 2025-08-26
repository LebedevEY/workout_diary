import { Context } from 'grammy'
import { WorkoutDatabase } from '../db/database'

interface PaymentSessionData {
  awaitingDate?: boolean
  awaitingCount?: boolean
  startDate?: string
}

const paymentSessions = new Map<number, PaymentSessionData>()

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(date + 'T00:00:00Z')
  return !isNaN(d.getTime())
}

export async function recordPaymentCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return
  const userId = db.getUserId(ctx.from.id)
  if (!userId) {
    await ctx.reply('Сначала используйте /start')
    return
  }
  paymentSessions.set(ctx.from.id, { awaitingDate: true })
  await ctx.reply('Введите дату начала оплаты в формате YYYY-MM-DD')
}

export async function handleRecordPaymentInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return
  const session = paymentSessions.get(ctx.from.id)
  if (!session) return

  if (session.awaitingDate) {
    const date = ctx.message.text.trim()
    if (!isValidDate(date)) {
      await ctx.reply('Некорректная дата. Используйте формат YYYY-MM-DD')
      return
    }
    session.startDate = date
    session.awaitingDate = false
    session.awaitingCount = true
    await ctx.reply('Сколько тренировок оплачено? Введите целое число')
    return
  }

  if (session.awaitingCount && session.startDate) {
    const paid = parseInt(ctx.message.text.trim(), 10)
    if (!Number.isInteger(paid) || paid <= 0) {
      await ctx.reply('Введите корректное целое число больше 0')
      return
    }

    const userId = db.getUserId(ctx.from.id)
    if (!userId) {
      await ctx.reply('Ошибка пользователя. Используйте /start')
      paymentSessions.delete(ctx.from.id)
      return
    }

    db.upsertPayment(userId, session.startDate, paid)
    paymentSessions.delete(ctx.from.id)

    const remainingInfo = db.getRemainingSessions(userId)
    if (remainingInfo) {
      await ctx.reply(
        `Оплата сохранена с ${remainingInfo.start_date}.\nОплачено: ${remainingInfo.paid}.\nПрошло тренировок: ${remainingInfo.done}.\nОсталось: ${Math.max(remainingInfo.remaining, 0)}`
      )
    } else {
      await ctx.reply('Оплата сохранена')
    }
  }
}

export function isAwaitingRecordPaymentInput(userId: number): boolean {
  const s = paymentSessions.get(userId)
  return !!(s?.awaitingDate || s?.awaitingCount)
}

export async function remainingSessionsCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return
  const userId = db.getUserId(ctx.from.id)
  if (!userId) {
    await ctx.reply('Сначала используйте /start')
    return
  }
  const info = db.getRemainingSessions(userId)
  if (!info) {
    await ctx.reply('Данные об оплате не найдены. Используйте /pay чтобы записать оплату')
    return
  }
  const remaining = Math.max(info.remaining, 0)
  await ctx.reply(
    `С ${info.start_date} прошло тренировок: ${info.done}.\nОплачено: ${info.paid}.\nОсталось: ${remaining}`
  )
}
