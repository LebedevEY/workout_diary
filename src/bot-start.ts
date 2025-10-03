import dotenv from 'dotenv';
import { WorkoutBot } from './bot/bot.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не найден в переменных окружения');
  console.error('Создайте файл .env и добавьте в него: BOT_TOKEN=your_bot_token');
  process.exit(1);
}

const bot = new WorkoutBot(BOT_TOKEN);

process.on('SIGINT', async () => {
  console.log('\nПолучен сигнал SIGINT. Завершение работы...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nПолучен сигнал SIGTERM. Завершение работы...');
  await bot.stop();
  process.exit(0);
});

bot.start().catch((error) => {
  console.error('Ошибка при запуске бота:', error);
  process.exit(1);
});
