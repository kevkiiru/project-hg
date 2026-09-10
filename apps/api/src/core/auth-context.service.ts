import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId?: string;
  actorId?: string;
  actorRole?: string;
  ip?: string;
  userAgent?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestContextService {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return als.run(ctx, fn);
  }
  get(): RequestContext {
    return als.getStore() ?? {};
  }
  set(partial: Partial<RequestContext>) {
    const s = als.getStore();
    if (s) Object.assign(s, partial);
  }
}
