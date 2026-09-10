import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPool, closeDb } from './client';

// Run after drizzle-kit push: btree_gist exclusions + append-only triggers.
async function main() {
  const here = __dirname;
  const sql = readFileSync(join(here, 'constraints.sql'), 'utf8');
  const pool = getPool();
  await pool.query(sql);
  console.log('integrity constraints applied');
  await closeDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
