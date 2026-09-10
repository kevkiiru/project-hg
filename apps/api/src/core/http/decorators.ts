import {
  Body,
  createParamDecorator,
  ExecutionContext,
  Query,
  SetMetadata,
} from '@nestjs/common';
import type { Permission, RoleName } from '@hiregari/types';
import { ZodSchema } from 'zod';
import { validationError } from './errors';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const ROLES_KEY = 'requiredRoles';
export const RequireRole = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

class ZodBodyPipe {
  constructor(private readonly schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw validationError(
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return result.data;
  }
}

export const ZodBody = (schema: ZodSchema) => Body(new ZodBodyPipe(schema));

class ZodQueryPipe {
  constructor(private readonly schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw validationError(
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return result.data;
  }
}

export const ZodQueryParams = (schema: ZodSchema) => Query(new ZodQueryPipe(schema));

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});

export const CorrelationId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().correlationId;
});
