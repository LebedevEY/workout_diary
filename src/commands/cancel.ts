import { Context } from 'grammy';
import { clearAddSession } from './add';
import { clearAddSetSession } from './addSet';
import { clearHistorySession } from './history';
import { clearCreateExerciseSession } from './createExercise';
import { clearPaymentSession } from './payment';

export async function cancelCommand(ctx: Context) {
  if (!ctx.from) return;

  const userId = ctx.from.id;

  clearAddSession(userId);
  clearAddSetSession(userId);
  clearHistorySession(userId);
  clearCreateExerciseSession(userId);
  clearPaymentSession(userId);

  await ctx.reply('Действие отменено. Используйте кнопки меню или команды.');
}
