import { Context, InlineKeyboard } from 'grammy';
import { WorkoutDatabase } from '../db/database';

interface SessionData {
  selectedExercise?: number;
  awaitingWeight?: boolean;
  awaitingReps?: boolean;
  weight?: number;
}

const sessions = new Map<number, SessionData>();

export async function addCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  const exercises = db.getExercises();
  const keyboard = new InlineKeyboard();

  exercises.forEach((exercise, index) => {
    keyboard.text(exercise.name, `exercise_${exercise.id}`);
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });

  sessions.set(ctx.from.id, {});

  await ctx.reply('Выберите упражнение:', {
    reply_markup: keyboard
  });
}

export async function handleExerciseSelection(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.callbackQuery?.data) return;

  const exerciseId = parseInt(ctx.callbackQuery.data.replace('exercise_', ''));
  const exercises = db.getExercises();
  const exercise = exercises.find(e => e.id === exerciseId);

  if (!exercise) {
    await ctx.answerCallbackQuery('Упражнение не найдено');
    return;
  }

  sessions.set(ctx.from.id, {
    selectedExercise: exerciseId,
    awaitingWeight: true
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Выбрано: ${exercise.name}\n\nВведите вес (в кг):`);
}

export async function handleWorkoutInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return;

  const session = sessions.get(ctx.from.id);
  if (!session) return;

  if (session.awaitingWeight) {
    const weight = parseFloat(ctx.message.text);
    if (isNaN(weight) || weight <= 0) {
      await ctx.reply('Пожалуйста, введите корректный вес (число больше 0):');
      return;
    }

    session.weight = weight;
    session.awaitingWeight = false;
    session.awaitingReps = true;

    await ctx.reply('Введите количество повторений:');
    return;
  }

  if (session.awaitingReps && session.selectedExercise && session.weight) {
    const reps = parseInt(ctx.message.text);
    if (isNaN(reps) || reps <= 0) {
      await ctx.reply('Пожалуйста, введите корректное количество повторений (целое число больше 0):');
      return;
    }

    const userId = db.getUserId(ctx.from.id);
    if (!userId) {
      await ctx.reply('Ошибка: пользователь не найден. Попробуйте команду /start');
      return;
    }

    try {
      db.addWorkout(userId, session.selectedExercise, session.weight, reps);
      
      const exercises = db.getExercises();
      const exercise = exercises.find(e => e.id === session.selectedExercise);
      
      await ctx.reply(`✅ Упражнение записано!\n\n${exercise?.name}: ${session.weight}кг × ${reps} повторений`);
    } catch (error) {
      console.error('Ошибка при сохранении тренировки:', error);
      await ctx.reply('Произошла ошибка при сохранении. Попробуйте еще раз.');
    }

    sessions.delete(ctx.from.id);
  }
}

export function isAwaitingInput(userId: number): boolean {
  const session = sessions.get(userId);
  return !!(session?.awaitingWeight || session?.awaitingReps);
}
