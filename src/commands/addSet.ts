import { Context, InlineKeyboard } from 'grammy';
import { WorkoutDatabase } from '../db/database.js';

interface AddSetSession {
  selectedExercise?: number;
  awaitingWeight?: boolean;
  awaitingReps?: boolean;
  weight?: number;
}

const addSetSessions = new Map<number, AddSetSession>();

export async function addSetCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.reply('Ошибка: пользователь не найден. Попробуйте команду /start');
    return;
  }

  const todaysExercises = db.getTodaysExercises(userId);
  
  if (todaysExercises.length === 0) {
    await ctx.reply('У вас пока нет упражнений за сегодня. Сначала добавьте упражнение командой /add');
    return;
  }

  const keyboard = new InlineKeyboard();

  todaysExercises.forEach((exercise, index) => {
    keyboard.text(
      `${exercise.name} (${exercise.set_count} подх.)`, 
      `addset_${exercise.id}`
    );
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });

  keyboard.row().text('➕ Добавить новое упражнение', 'addset_new');

  addSetSessions.set(ctx.from.id, {});

  await ctx.reply('Выберите упражнение для добавления подхода:', {
    reply_markup: keyboard
  });
}

export async function handleAddSetSelection(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.callbackQuery?.data) return;

  const data = ctx.callbackQuery.data;
  
  if (data === 'addset_new') {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Используйте команду /add для добавления нового упражнения');
    return;
  }

  const exerciseId = parseInt(data.replace('addset_', ''));
  const exercises = db.getExercises();
  const exercise = exercises.find(e => e.id === exerciseId);

  if (!exercise) {
    await ctx.answerCallbackQuery('Упражнение не найдено');
    return;
  }

  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.answerCallbackQuery('Пользователь не найден');
    return;
  }

  const todaysExercises = db.getTodaysExercises(userId);
  const todaysExercise = todaysExercises.find(e => e.id === exerciseId);

  addSetSessions.set(ctx.from.id, {
    selectedExercise: exerciseId,
    awaitingWeight: true
  });

  const lastSetInfo = todaysExercise 
    ? `\nПоследний подход: ${todaysExercise.last_weight}кг × ${todaysExercise.last_reps} повторений`
    : '';

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`Выбрано: ${exercise.name}${lastSetInfo}\n\nВведите вес (в кг):`);
}

export async function handleAddSetInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return;

  const session = addSetSessions.get(ctx.from.id);
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
      const today = new Date().toISOString().split('T')[0];
      const setNumber = db.getNextSetNumber(userId, session.selectedExercise, today);
      
      db.addWorkout(userId, session.selectedExercise, session.weight, reps, setNumber);
      
      const exercises = db.getExercises();
      const exercise = exercises.find(e => e.id === session.selectedExercise);
      
      await ctx.reply(`✅ Подход добавлен!\n\n${exercise?.name} - Подход ${setNumber}: ${session.weight}кг × ${reps} повторений`);
    } catch (error) {
      console.error('Ошибка при сохранении подхода:', error);
      await ctx.reply('Произошла ошибка при сохранении. Попробуйте еще раз.');
    }

    addSetSessions.delete(ctx.from.id);
  }
}

export function isAwaitingAddSetInput(userId: number): boolean {
  const session = addSetSessions.get(userId);
  return !!(session?.awaitingWeight || session?.awaitingReps);
}
