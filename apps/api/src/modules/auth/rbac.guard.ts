import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MFA_PERMISSIONS,
  Permission,
  RoleName,
  ROLE_PERMISSIONS,
} from '@hiregari/types';
import { AppError, forbidden, unauthorized } from '../../core/http/errors';
import { PERMISSIONS_KEY, ROLES_KEY, IS_PUBLIC } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { config } from '../../core/config/config';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredRoles =
      this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) throw unauthorized();

    const roles = user.roles.map((r) => r.role);
    if (requiredRoles.length && !requiredRoles.some((r) => roles.includes(r))) {
      throw forbidden();
    }
    if (requiredPermissions.length) {
      const granted = new Set<Permission>();
      for (const role of roles) {
        for (const p of ROLE_PERMISSIONS[role] ?? []) granted.add(p);
      }
      // Explicit per-staff grants are stored as permission strings.
      const all = granted;
      if (!requiredPermissions.every((p) => all.has(p))) {
        throw forbidden();
      }
      for (const p of requiredPermissions) {
        if (MFA_PERMISSIONS.has(p)) {
          const mfaRequired =
            config().ADMIN_MFA_REQUIRED && config().NODE_ENV !== 'development';
          if (mfaRequired && !user.mfaVerifiedAt) {
            throw new AppError(403, 'MFA_REQUIRED', 'Re-verify with your authenticator to continue.');
          }
        }
      }
    }
    return true;
  }
}
