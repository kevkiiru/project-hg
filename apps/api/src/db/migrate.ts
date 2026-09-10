import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getPool, closeDb } from './client';

const here = __dirname;

async function main() {
  const pool = getPool();
  const d = drizzle(pool);
  await migrate(d, { migrationsFolder: join(here, '../../drizzle') });
  await pool.query(readFileSync(join(here, 'constraints.sql'), 'utf8'));
  console.log('migrations + constraints applied');
  await closeDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
