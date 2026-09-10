import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { config } from '../../core/config/config';
import { ErrorCode, unauthorized } from '../../core/http/errors';
import { IS_PUBLIC } from '../../core/http/decorators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request & { user?: any; session?: any }>();
    const token = this.extractToken(req);
    if (!token) {
      if (isPublic) return true;
      throw unauthorized();
    }
    const resolved = await this.auth.resolveSessionToken(token);
    if (!resolved) {
      if (isPublic) return true;
      throw unauthorized('Your session has expired. Please sign in again.', ErrorCode.SESSION_EXPIRED);
    }
    if (resolved.user.status === 'SUSPENDED' || resolved.user.status === 'DELETED') {
      throw unauthorized('This account is suspended. Contact support.');
    }
    req.user = resolved.user;
    req.session = resolved.session;

    // CSRF double-submit for cookie-authenticated mutating requests.
    const method = req.method.toUpperCase();
    if (config().CSRF_ENABLED && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const headerToken = req.headers['x-csrf-token'];
      if (!resolved.session.csrfSecret || headerToken !== resolved.session.csrfSecret) {
        throw unauthorized('Invalid security token. Refresh and try again.', 'CSRF_INVALID' as any);
      }
    }
    return true;
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    const cookie = (req as any).cookies?.hg_session;
    return typeof cookie === 'string' ? cookie : null;
  }
}
