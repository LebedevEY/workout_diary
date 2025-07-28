import { Context } from 'grammy';
import { WorkoutDatabase } from '../db/database';

interface CreateExerciseSession {
  awaitingName?: boolean;
  awaitingCategory?: boolean;
  name?: string;
}

const createExerciseSessions = new Map<number, CreateExerciseSession>();

export async function createExerciseCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  createExerciseSessions.set(ctx.from.id, { awaitingName: true });
  
  await ctx.reply('Введите название нового упражнения:');
}

export async function handleCreateExerciseInput(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from || !ctx.message?.text) return;

  const session = createExerciseSessions.get(ctx.from.id);
  if (!session) return;

  const input = ctx.message.text.trim();

  try {
    if (session.awaitingName) {
      if (input.length < 2) {
        await ctx.reply('Название упражнения должно содержать минимум 2 символа. Попробуйте еще раз:');
        return;
      }

      if (db.exerciseExists(input)) {
        await ctx.reply('Упражнение с таким названием уже существует. Введите другое название:');
        return;
      }

      session.name = input;
      session.awaitingName = false;
      session.awaitingCategory = true;

      await ctx.reply('Введите категорию упражнения (например: Грудь, Спина, Ноги, Руки):');
    } else if (session.awaitingCategory && session.name) {
      if (input.length < 2) {
        await ctx.reply('Категория должна содержать минимум 2 символа. Попробуйте еще раз:');
        return;
      }

      const exerciseId = db.createExercise(session.name, input);
      
      await ctx.reply(`✅ Упражнение "${session.name}" (категория: ${input}) успешно создано!`);
      
      createExerciseSessions.delete(ctx.from.id);
    }
  } catch (error) {
    console.error('Ошибка при создании упражнения:', error);
    await ctx.reply('Произошла ошибка при создании упражнения. Попробуйте еще раз.');
    createExerciseSessions.delete(ctx.from.id);
  }
}

export function isAwaitingCreateExerciseInput(userId: number): boolean {
  return createExerciseSessions.has(userId);
}
