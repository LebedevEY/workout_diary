import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Запуск Telegram-бота и админ-панели...\n');

const botProcess = spawn('node', [path.join(process.cwd(), 'dist', 'bot-start.js')], {
  stdio: 'inherit',
  cwd: process.cwd()
});

const adminProcess = spawn('node', [path.join(process.cwd(), 'dist', 'admin', 'index.js')], {
  stdio: 'inherit',
  cwd: process.cwd()
});

botProcess.on('error', (error) => {
  console.error('Ошибка запуска бота:', error);
});

adminProcess.on('error', (error) => {
  console.error('Ошибка запуска админки:', error);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Остановка всех сервисов...');
  botProcess.kill('SIGINT');
  adminProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Остановка всех сервисов...');
  botProcess.kill('SIGTERM');
  adminProcess.kill('SIGTERM');
  process.exit(0);
});

botProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Бот завершился с кодом ${code}`);
    adminProcess.kill();
    process.exit(code || 1);
  }
});

adminProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Админка завершилась с кодом ${code}`);
    botProcess.kill();
    process.exit(code || 1);
  }
});
