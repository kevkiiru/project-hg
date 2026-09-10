import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema> & { $schema: typeof schema };

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export const db: Db = drizzle(getPool(), { schema }) as unknown as Db;
(db as any).$schema = schema;

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export function makeDb(url: string): Db {
  const p = new Pool({ connectionString: url, max: 5 });
  return drizzle(p, { schema }) as unknown as Db;
}
