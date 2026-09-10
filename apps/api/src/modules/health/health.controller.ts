import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from '../../core/http/decorators';
import { DB, type Db } from '../../db/db.module';
import { config } from '../../core/config/config';

@Controller('api/v1/health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', service: 'hiregari-api', ts: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    let ok = true;
    try {
      await this.db.execute(sql`select 1`);
      checks.database = 'up';
    } catch {
      checks.database = 'down';
      ok = false;
    }
    checks.queue = 'inline'; // Redis optional; inline fallback active per ADR
    return {
      status: ok ? 'ok' : 'degraded',
      env: config().NODE_ENV,
      checks,
      ts: new Date().toISOString(),
    };
  }
}
