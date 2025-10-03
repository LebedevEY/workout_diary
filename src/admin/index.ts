import dotenv from 'dotenv';
import { WorkoutDatabase } from '../db/database.js';
import { AdminServer } from './server.js';

dotenv.config();

const PORT = parseInt(process.env.ADMIN_PORT || '3000');
const db = new WorkoutDatabase();
const server = new AdminServer(db, PORT);

server.start();

process.on('SIGINT', () => {
  console.log('\nЗавершение работы админ-панели...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nЗавершение работы админ-панели...');
  db.close();
  process.exit(0);
});
