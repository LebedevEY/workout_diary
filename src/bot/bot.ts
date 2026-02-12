import { Bot, Context, GrammyError, HttpError } from 'grammy';
import { WorkoutDatabase } from '../db/database.js';
import { startCommand } from '../commands/start.js';
import { helpCommand } from '../commands/help.js';
import {
  addCommand,
  handleExerciseSelection,
  handleWorkoutInput,
  isAwaitingInput,
} from '../commands/add.js';
import {
  addSetCommand,
  handleAddSetSelection,
  handleAddSetInput,
  isAwaitingAddSetInput,
} from '../commands/addSet.js';
import {
  historyCommand,
  handleHistorySelection,
  handleDateInput,
  isAwaitingHistoryInput,
} from '../commands/history.js';
import {
  createExerciseCommand,
  handleCreateExerciseInput,
  isAwaitingCreateExerciseInput,
} from '../commands/createExercise.js';
import {
  recordPaymentCommand,
  handleRecordPaymentInput,
  isAwaitingRecordPaymentInput,
  remainingSessionsCommand,
} from '../commands/payment.js';
import { cancelCommand } from '../commands/cancel.js';
import { undoCommand } from '../commands/undo.js';
import { setupScheduler } from './scheduler.js';

export class WorkoutBot {
  private bot: Bot;
  private db: WorkoutDatabase;

  constructor(token: string, dbPath?: string) {
    this.bot = new Bot(token);
    this.db = new WorkoutDatabase(dbPath);
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.bot.command('start', (ctx) => startCommand(ctx, this.db));
    this.bot.command('add', (ctx) => addCommand(ctx, this.db));
    this.bot.command('addset', (ctx) => addSetCommand(ctx, this.db));
    this.bot.command('history', (ctx) => historyCommand(ctx, this.db));
    this.bot.command('create', (ctx) => createExerciseCommand(ctx, this.db));
    this.bot.command('pay', (ctx) => recordPaymentCommand(ctx, this.db));
    this.bot.command('remaining', (ctx) => remainingSessionsCommand(ctx, this.db));
    this.bot.command('cancel', (ctx) => cancelCommand(ctx));
    this.bot.command('undo', (ctx) => undoCommand(ctx, this.db));
    this.bot.command('help', helpCommand);

    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      
      if (data.startsWith('exercise_')) {
        await handleExerciseSelection(ctx, this.db);
      } else if (data.startsWith('addset_')) {
        await handleAddSetSelection(ctx, this.db);
      } else if (data.startsWith('history_')) {
        await handleHistorySelection(ctx, this.db);
      }
    });

    this.bot.on('message:text', async (ctx) => {
      if (!ctx.from) return;

      const text = ctx.message.text;

      if (text === '📝 Добавить упражнение') {
        await addCommand(ctx, this.db);
        return;
      }
      
      if (text === '🔄 Добавить подход') {
        await addSetCommand(ctx, this.db);
        return;
      }
      
      if (text === '📊 История тренировок') {
        await historyCommand(ctx, this.db);
        return;
      }

      if (text === '💳 Записать оплату') {
        await recordPaymentCommand(ctx, this.db);
        return;
      }

      if (text === '📉 Осталось тренировок') {
        await remainingSessionsCommand(ctx, this.db);
        return;
      }
      
      if (text === '↩️ Отменить последнее') {
        await undoCommand(ctx, this.db);
        return;
      }

      if (text === 'ℹ️ Помощь') {
        await helpCommand(ctx);
        return;
      }

      if (isAwaitingInput(ctx.from.id)) {
        await handleWorkoutInput(ctx, this.db);
      } else if (isAwaitingAddSetInput(ctx.from.id)) {
        await handleAddSetInput(ctx, this.db);
      } else if (isAwaitingHistoryInput(ctx.from.id)) {
        await handleDateInput(ctx, this.db);
      } else if (isAwaitingCreateExerciseInput(ctx.from.id)) {
        await handleCreateExerciseInput(ctx, this.db);
      } else if (isAwaitingRecordPaymentInput(ctx.from.id)) {
        await handleRecordPaymentInput(ctx, this.db);
      } else {
        await ctx.reply('Используйте кнопки меню или команды:\n/add - добавить упражнение\n/addset - добавить подход\n/history - посмотреть историю\n/create - создать упражнение\n/pay - записать оплату\n/remaining - остаток тренировок\n/cancel - отменить действие\n/undo - удалить последнюю запись\n/help - помощь');
      }
    });
  }

  private setupErrorHandling(): void {
    this.bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
      const e = err.error;
      
      if (e instanceof GrammyError) {
        console.error('Ошибка в запросе:', e.description);
      } else if (e instanceof HttpError) {
        console.error('Не удалось связаться с Telegram:', e);
      } else {
        console.error('Неизвестная ошибка:', e);
      }
    });
  }

  async start(): Promise<void> {
    await this.setupBotCommands();
    console.log('Запуск бота...');
    await this.bot.start();
    console.log('Бот запущен');
    setupScheduler(this.bot, this.db);
  }

  private async setupBotCommands(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Начать работу с ботом' },
      { command: 'add', description: 'Добавить упражнение' },
      { command: 'addset', description: 'Добавить подход к упражнению' },
      { command: 'history', description: 'История тренировок' },
      { command: 'create', description: 'Создать новое упражнение' },
      { command: 'pay', description: 'Записать оплату' },
      { command: 'remaining', description: 'Остаток тренировок' },
      { command: 'cancel', description: 'Отменить текущее действие' },
      { command: 'undo', description: 'Удалить последнюю запись' },
      { command: 'help', description: 'Помощь и инструкции' }
    ]);
  }

  async stop(): Promise<void> {
    console.log('Остановка бота...');
    await this.bot.stop();
    this.db.close();
  }
}
