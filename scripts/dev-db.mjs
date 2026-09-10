// Local development PostgreSQL via embedded-postgres (ZIG-compiled binaries bundled on npm).
// In staging/production use a managed PostgreSQL instance (see docs/deployment.md).
import { mkdirSync } from 'node:fs';
import { default as EmbeddedPostgres } from 'embedded-postgres';

const PORT = Number(process.env.PG_EMBEDDED_PORT || 55432);
const DATA_DIR = process.env.PG_EMBEDDED_DIR || '.pgdata';
const USER = process.env.PG_EMBEDDED_USER || 'hiregari';
const PASSWORD = process.env.PG_EMBEDDED_PASSWORD || 'hiregari';
const DATABASE = process.env.PG_EMBEDDED_DB || 'hiregari';

mkdirSync(DATA_DIR, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  initdbFlags: [],
  postgresFlags: [],
});

const cmd = process.argv[2];
async function start() {
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(DATABASE);
    console.log(`database '${DATABASE}' created`);
  } catch (e) {
    if (!String(e?.message).includes('already exists')) throw e;
  }
  console.log(`PostgreSQL ready on postgresql://${USER}:***@127.0.0.1:${PORT}/${DATABASE}`);
  console.log('Press Ctrl+C to stop.');
  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}
async function stop() {
  try {
    await pg.stop();
    console.log('PostgreSQL stopped');
  } catch (e) {
    console.log('already stopped');
  }
}
if (cmd === 'start') await start();
else if (cmd === 'stop') await stop();
else {
  console.error('usage: node scripts/dev-db.mjs [start|stop]');
  process.exit(1);
}
