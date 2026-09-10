import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { setCorrelationId } from '../logger';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const incoming = req.headers['x-correlation-id'];
    const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : `req_${randomUUID()}`;
    req.correlationId = id;
    res.setHeader('X-Correlation-Id', id);
    setCorrelationId(id);
    next();
  }
}
