// Applies pending database migrations: npm run migrate
import { closeDatabase, migrate } from '../src/db.js';

const applied = await migrate();
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
await closeDatabase();
