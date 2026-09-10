import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RbacGuard } from './rbac.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [IntegrationsModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
