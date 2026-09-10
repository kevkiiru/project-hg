import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module';
import { auditLogs } from '../../db/schema/trust';
import { pagination } from '../../core/pagination';

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  prevValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async record(entry: AuditEntry) {
    await this.db.insert(auditLogs).values({
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      prevValue: (entry.prevValue ?? null) as any,
      newValue: (entry.newValue ?? null) as any,
      reason: entry.reason ?? null,
      requestId: entry.requestId ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  }

  async list(query: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { limit, offset, page, pageSize } = pagination(query.page, query.pageSize);
    const filters: any[] = [];
    if (query.entityType) filters.push(eq(auditLogs.entityType, query.entityType));
    if (query.entityId) filters.push(eq(auditLogs.entityId, query.entityId));
    if (query.actorId) filters.push(eq(auditLogs.actorId, query.actorId));
    if (query.from) filters.push(gte(auditLogs.createdAt, query.from));
    if (query.to) filters.push(lte(auditLogs.createdAt, query.to));
    const where = filters.length ? and(...filters) : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ c: sql<string>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);
    return { data: rows, page, pageSize, total: Number(countRows[0]?.c ?? 0) };
  }
}
