import { Context, InlineKeyboard } from 'grammy';
import { WorkoutDatabase } from '../db/database';

interface HistorySession {
  awaitingDate?: boolean;
  awaitingPeriod?: 'start' | 'end';
  startDate?: string;
}

const historySessions = new Map<number, HistorySession>();

export async function historyCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  const keyboard = new InlineKeyboard()
    .text('Сегодня', 'history_today')
    .text('Вчера', 'history_yesterday').row()
    .text('Неделя назад', 'history_week_ago').row()
    .text('Выбрать дату', 'history_custom_date')
    .text('За период', 'history_period');

  await ctx.reply('Выберите период для просмотра истории:', {
    reply_markup: keyboard
  });
}

export async function handleHistorySelection(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.callbackQuery?.data) return;

  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.answerCallbackQuery('Пользователь не найден');
    return;
  }

  const action = ctx.callbackQuery.data;
  let date: string;
  let workouts: Array<any> = [];

  try {
    switch (action) {
      case 'history_today':
        date = new Date().toISOString().split('T')[0];
        workouts = db.getWorkoutsByDate(userId, date);
        console.log(`Получено тренировок за сегодня: ${workouts.length}`);
        await showWorkouts(ctx, workouts, 'Тренировки за сегодня');
        break;

      case 'history_yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = yesterday.toISOString().split('T')[0];
        workouts = db.getWorkoutsByDate(userId, date);
        console.log(`Получено тренировок за вчера: ${workouts.length}`);
        await showWorkouts(ctx, workouts, 'Тренировки за вчера');
        break;

      case 'history_week_ago':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        date = weekAgo.toISOString().split('T')[0];
        workouts = db.getWorkoutsByDate(userId, date);
        console.log(`Получено тренировок неделю назад: ${workouts.length}`);
        await showWorkouts(ctx, workouts, 'Тренировки неделю назад');
        break;

      case 'history_custom_date':
        historySessions.set(ctx.from.id, { awaitingDate: true });
        await ctx.answerCallbackQuery();
        await ctx.editMessageText('Введите дату в формате ДД.ММ.ГГГГ (например: 22.07.2024):');
        return;

      case 'history_period':
        historySessions.set(ctx.from.id, { awaitingPeriod: 'start' });
        await ctx.answerCallbackQuery();
        await ctx.editMessageText('Введите начальную дату периода в формате ДД.ММ.ГГГГ:');
        return;
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Ошибка при получении истории:', error);
    await ctx.answerCallbackQuery('Произошла ошибка');
    await ctx.reply('Произошла ошибка при получении истории тренировок.');
  }
}

export async function handleDateInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return;

  const session = historySessions.get(ctx.from.id);
  if (!session) return;

  const dateText = ctx.message.text.trim();
  
  if (!isValidDate(dateText)) {
    await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например: 22.07.2024):');
    return;
  }
  
  const isoDate = convertToISODate(dateText);

  const userId = db.getUserId(ctx.from.id);
  if (!userId) {
    await ctx.reply('Ошибка: пользователь не найден');
    return;
  }

  try {
    if (session.awaitingDate) {
      const workouts = db.getWorkoutsByDate(userId, isoDate);
      await showWorkouts(ctx, workouts, `Тренировки за ${formatDisplayDate(dateText)}`);
      historySessions.delete(ctx.from.id);
    } else if (session.awaitingPeriod === 'start') {
      session.startDate = isoDate;
      session.awaitingPeriod = 'end';
      await ctx.reply('Введите конечную дату периода в формате ДД.ММ.ГГГГ:');
    } else if (session.awaitingPeriod === 'end' && session.startDate) {
      if (isoDate < session.startDate) {
        await ctx.reply('Конечная дата не может быть раньше начальной. Введите корректную конечную дату:');
        return;
      }
      
      const workouts = db.getWorkoutsByPeriod(userId, session.startDate, isoDate);
      await showWorkouts(ctx, workouts, `Тренировки с ${formatDate(session.startDate)} по ${formatDisplayDate(dateText)}`);
      historySessions.delete(ctx.from.id);
    }
  } catch (error) {
    console.error('Ошибка при получении истории:', error);
    await ctx.reply('Произошла ошибка при получении истории тренировок.');
  }
}

async function showWorkouts(ctx: Context, workouts: Array<any>, title: string) {
  if (workouts.length === 0) {
    await ctx.reply(`${title}:\n\nТренировок не найдено.`);
    return;
  }

  let message = `${title}:\n\n`;
  
  const groupedByDate: { [key: string]: Array<any> } = {};
  
  workouts.forEach(workout => {
    const date = workout.created_at.split(' ')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(workout);
  });

  Object.keys(groupedByDate).sort().forEach(date => {
    message += `📅 ${formatDate(date)}:\n`;
    
    const exerciseGroups: { [key: string]: Array<any> } = {};
    groupedByDate[date].forEach(workout => {
      if (!exerciseGroups[workout.exercise_name]) {
        exerciseGroups[workout.exercise_name] = [];
      }
      exerciseGroups[workout.exercise_name].push(workout);
    });
    
    Object.keys(exerciseGroups)
      .sort((a, b) => {
        const firstSetA = exerciseGroups[a][0];
        const firstSetB = exerciseGroups[b][0];
        return firstSetA.created_at.localeCompare(firstSetB.created_at);
      })
      .forEach(exerciseName => {
      const sets = exerciseGroups[exerciseName].sort((a, b) => {
        const aSetNum = a.set_number || 1;
        const bSetNum = b.set_number || 1;
        return aSetNum - bSetNum;
      });
      message += `• ${exerciseName}:\n`;
      sets.forEach(workout => {
        const time = workout.created_at.split(' ')[1]?.substring(0, 5) || '';
        const setNum = workout.set_number || 1;
        message += `  • Подход ${setNum}: ${workout.weight}кг × ${workout.reps} повторений`;
        if (time) message += ` (${time})`;
        message += '\n';
      });
    });
    message += '\n';
  });

  if (message.length > 4000) {
    const chunks = message.match(/.{1,4000}/g) || [message];
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } else {
    await ctx.reply(message);
  }
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{2}\.\d{2}\.\d{4}$/;
  if (!regex.test(dateString)) return false;
  const [day, month, year] = dateString.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  return date instanceof Date && !isNaN(date.getTime()) &&
         date.getDate() === day &&
         date.getMonth() === month - 1 &&
         date.getFullYear() === year;
}

function convertToISODate(dateString: string): string {
  const [day, month, year] = dateString.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDisplayDate(dateString: string): string {
  return dateString;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function isAwaitingHistoryInput(userId: number): boolean {
  const session = historySessions.get(userId);
  return !!(session?.awaitingDate || session?.awaitingPeriod);
}
