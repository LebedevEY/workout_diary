import { Context, Keyboard } from 'grammy';
import { WorkoutDatabase } from '../db/database.js';

export async function startCommand(ctx: Context, db: WorkoutDatabase) {
  if (!ctx.from) return;

  db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name);

  const keyboard = new Keyboard()
    .text('📝 Добавить упражнение').row()
    .text('🔄 Добавить подход').row()
    .text('📊 История тренировок').row()
    .text('ℹ️ Помощь')
    .resized();

  const welcomeMessage = `
🏋️‍♂️ Добро пожаловать в дневник тренировок!

Используйте кнопки меню ниже или команды:
/add - Добавить упражнение
/addset - Добавить подход к упражнению
/history - Посмотреть историю тренировок

Начните с добавления упражнения!
  `.trim();

  await ctx.reply(welcomeMessage, {
    reply_markup: keyboard
  });
}
