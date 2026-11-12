// One-time import of the old JSON store into Postgres. Stop the server first.
//   node --env-file=.env scripts/import-json-store.js ./data/store.json
import { closeDatabase, migrate } from '../src/db.js';
import { importJsonStore } from '../src/import-json.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node --env-file=.env scripts/import-json-store.js <path-to-store.json>');
  process.exit(1);
}

try {
  await migrate();
  const summary = await importJsonStore(file);
  console.log('Imported and verified:');
  for (const [name, value] of Object.entries(summary)) console.log(`  ${name}: ${value}`);
} catch (error) {
  console.error(`Import failed, nothing was written: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
