import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '../../..');
export const API_DIR = resolve(REPO_ROOT, 'apps/api');

export interface TestPgOptions {
  port?: number;
  dataDir?: string;
  database?: string;
  user?: string;
  password?: string;
}

let pgServer: any;

export function testDatabaseUrl(opts: TestPgOptions = {}) {
  const port = opts.port ?? 55433;
  const database = opts.database ?? 'hiregari_test';
  const user = opts.user ?? 'hiregari';
  const password = opts.password ?? 'hiregari';
  return `postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`;
}

export async function startTestPostgres(opts: TestPgOptions = {}) {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = opts.port ?? 55433;
  const database = opts.database ?? 'hiregari_test';
  const user = opts.user ?? 'hiregari';
  const password = opts.password ?? 'hiregari';
  const dataDir = resolve(API_DIR, opts.dataDir ?? '.pgdata-test');
  mkdirSync(dataDir, { recursive: true });
  pgServer = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
  });
  await pgServer.initialise();
  await pgServer.start();
  try {
    await pgServer.createDatabase(database);
  } catch {
    // exists
  }
  return testDatabaseUrl(opts);
}

export async function stopTestPostgres() {
  if (pgServer) {
    await pgServer.stop();
    pgServer = undefined;
  }
}

function bin(name: string, script: string) {
  const candidates = [
    resolve(REPO_ROOT, `node_modules/${name}/${script}`),
    resolve(API_DIR, `node_modules/${name}/${script}`),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`${name} not found; run npm install`);
}

/** Drop all data, push the drizzle schema, then apply integrity constraints. */
export async function resetTestDatabase(databaseUrl: string) {
  // Drop everything for a deterministic slate.
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`);
  await client.end();

  const drizzleKit = bin('drizzle-kit', 'bin.cjs');
  const res = spawnSync(process.execPath, [drizzleKit, 'push', '--force', '--config=drizzle.config.ts'], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`drizzle-kit push failed:\n${res.stdout}\n${res.stderr}`);
  }
  await applyConstraints(databaseUrl);
}

/** Apply btree_gist exclusion constraints & immutability triggers (idempotent). */
export async function applyConstraints(databaseUrl: string) {
  const sqlPath = resolve(API_DIR, 'src/db/constraints.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(sql);
  await client.end();
}
