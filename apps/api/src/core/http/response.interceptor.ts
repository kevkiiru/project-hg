import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

// Success envelope: controllers return raw data; we wrap as { data }.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && '__raw' in (payload as any)) {
          return (payload as any).__raw;
        }
        return { data: payload };
      }),
    );
  }
}

/** Return a non-wrapped response (e.g. webhook text, files). */
export const rawResponse = (body: unknown) => ({ __raw: body });
