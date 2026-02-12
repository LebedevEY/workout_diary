import { Context } from 'grammy';
import { WorkoutDatabase } from '../db/database';
import { isoToDDMMYYYY } from '../utils/date';

export async function undoCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.reply('Ошибка: пользователь не найден. Попробуйте команду /start');
    return;
  }

  const lastWorkout = db.getLastWorkout(userId);
  if (!lastWorkout) {
    await ctx.reply('Нет записей для удаления.');
    return;
  }

  const datePart = lastWorkout.created_at.split(' ')[0];
  const displayDate = isoToDDMMYYYY(datePart);
  const deleted = db.deleteWorkout(lastWorkout.id);

  if (deleted) {
    await ctx.reply(
      `Удалена последняя запись:\n${lastWorkout.exercise_name} - Подход ${lastWorkout.set_number}: ${lastWorkout.weight}кг x ${lastWorkout.reps} повт. (${displayDate})`
    );
  } else {
    await ctx.reply('Не удалось удалить запись. Попробуйте ещё раз.');
  }
}
