import { Context } from 'grammy';
import { WorkoutDatabase } from '../db/database';
import { isValidDateDDMMYYYY, ddmmyyyyToISO, isoToDDMMYYYY } from '../utils/date';
import { SessionManager } from '../utils/sessionManager';

interface PaymentSessionData {
  awaitingDate?: boolean;
  awaitingCount?: boolean;
  startDate?: string;
}

const paymentSessions = new SessionManager<PaymentSessionData>();

export async function recordPaymentCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;
  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.reply('Сначала используйте /start');
    return;
  }
  paymentSessions.set(ctx.from.id, { awaitingDate: true });
  await ctx.reply('Введите дату начала оплаты в формате ДД.ММ.ГГГГ');
}

export async function handleRecordPaymentInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return;
  const session = paymentSessions.get(ctx.from.id);
  if (!session) return;

  if (session.awaitingDate) {
    const date = ctx.message.text.trim();
    if (!isValidDateDDMMYYYY(date)) {
      await ctx.reply('Некорректная дата. Используйте формат ДД.ММ.ГГГГ');
      return;
    }
    session.startDate = date;
    session.awaitingDate = false;
    session.awaitingCount = true;
    await ctx.reply('Сколько тренировок оплачено? Введите целое число');
    return;
  }

  if (session.awaitingCount && session.startDate) {
    const paid = parseInt(ctx.message.text.trim(), 10);
    if (!Number.isInteger(paid) || paid <= 0) {
      await ctx.reply('Введите корректное целое число больше 0');
      return;
    }

    const userId = db.getUserId(ctx.from.id);
    if (!userId) {
      await ctx.reply('Ошибка пользователя. Используйте /start');
      paymentSessions.delete(ctx.from.id);
      return;
    }

    const iso = ddmmyyyyToISO(session.startDate);
    db.upsertPayment(userId, iso, paid);
    paymentSessions.delete(ctx.from.id);

    const remainingInfo = db.getRemainingSessions(userId);
    if (remainingInfo) {
      const startDisp = isoToDDMMYYYY(remainingInfo.start_date);
      await ctx.reply(`Оплата сохранена с ${startDisp}.\nОплачено: ${remainingInfo.paid}.\nПрошло тренировок: ${remainingInfo.done}.\nОсталось: ${Math.max(remainingInfo.remaining, 0)}`);
    } else {
      await ctx.reply('Оплата сохранена');
    }
  }
}

export function isAwaitingRecordPaymentInput(userId: number): boolean {
  const s = paymentSessions.get(userId);
  return !!(s?.awaitingDate || s?.awaitingCount);
}

export function clearPaymentSession(userId: number): void {
  paymentSessions.delete(userId);
}

export async function remainingSessionsCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;
  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.reply('Сначала используйте /start');
    return;
  }
  const info = db.getRemainingSessions(userId);
  if (!info) {
    await ctx.reply('Данные об оплате не найдены. Используйте /pay чтобы записать оплату');
    return;
  }
  const remaining = Math.max(info.remaining, 0);
  const startDisp = isoToDDMMYYYY(info.start_date);
  await ctx.reply(`С ${startDisp} прошло тренировок: ${info.done}.\nОплачено: ${info.paid}.\nОсталось: ${remaining}`);
}
