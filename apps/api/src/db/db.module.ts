import { Global, Module } from '@nestjs/common';

export const DB = Symbol('DB');

import { db, type Db, closeDb, getPool } from './client';

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DbModule {}

export type { Db };
export { db, closeDb, getPool };
