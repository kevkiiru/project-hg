import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError, ErrorCode } from './errors';
import { sanitize } from '../logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId = req.correlationId;

    if (exception instanceof AppError) {
      if (exception.status >= 500) {
        this.logger.error(exception.message, sanitize({ code: exception.code, ...exception.internalDetails }));
      }
      return res.status(exception.status).json({
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details?.length ? { details: exception.details } : {}),
          status: exception.status,
        },
        correlationId,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as any;
      const message =
        typeof response === 'object' && typeof response.message === 'string'
          ? response.message
          : status === 404
            ? 'The requested resource was not found.'
            : status === 401
              ? 'Please sign in to continue.'
              : status === 403
                ? 'You do not have permission to perform this action.'
                : status === 429
                  ? 'Too many requests. Please slow down and try again shortly.'
                  : 'We could not complete that request. Please try again.';
      const details = Array.isArray(response?.message)
        ? response.message.map((m: string) => ({ path: '', message: m }))
        : undefined;
      return res.status(status).json({
        error: {
          code: response?.code ?? status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHENTICATED' : 'REQUEST_ERROR',
          message,
          ...(details ? { details } : {}),
          status,
        },
        correlationId,
      });
    }

    const err = exception as Error;
    // Postgres unique violation etc. are surfaced as conflicts where relevant.
    const code = (err as any)?.code;
    if (code === '23505') {
      return res.status(409).json({
        error: { code: ErrorCode.CONFLICT, message: 'That record already exists.', status: 409 },
        correlationId,
      });
    }
    if (code === '23P01' || code === '23514') {
      // exclusion constraint / check violation
      return res.status(409).json({
        error: {
          code: ErrorCode.VEHICLE_NOT_AVAILABLE,
          message: 'This vehicle is no longer available for the selected dates.',
          status: 409,
        },
        correlationId,
      });
    }

    this.logger.error(err?.message ?? 'unhandled exception', {
      stack: err?.stack?.split('\n').slice(0, 12),
      path: req?.path,
    });
    return res.status(500).json({
      error: {
        code: ErrorCode.INTERNAL,
        message: 'Something went wrong on our side. Our team has been notified — please try again.',
        status: 500,
      },
      correlationId,
    });
  }
}
