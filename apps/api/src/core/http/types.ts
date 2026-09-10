import type { RoleName } from '@hiregari/types';

export interface AuthUser {
  id: string;
  email: string | null;
  phoneE164: string | null;
  firstName: string;
  lastName: string;
  status: string;
  roles: { role: RoleName; scopeType: string; scopeId: string | null }[];
  mfaVerifiedAt: Date | null;
  sessionId: string;
  csrfSecret: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId?: string;
      idempotencyKey?: string;
    }
  }
}

export {};

import type { RoleName as _RoleName } from '@hiregari/types';

export function roleNames(user: AuthUser | undefined | null): _RoleName[] {
  return (user?.roles ?? []).map((r) => r.role);
}
export function hasRole(user: AuthUser | undefined | null, ...names: _RoleName[]): boolean {
  const roles = roleNames(user);
  return names.some((n) => roles.includes(n));
}
export function isHostSide(user: AuthUser | undefined | null): boolean {
  return hasRole(user, 'HOST' as _RoleName, 'HOST_STAFF' as _RoleName);
}
