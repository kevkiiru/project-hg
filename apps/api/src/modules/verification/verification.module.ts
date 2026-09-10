import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DriverVerificationController } from './driver-verification.controller';
import { DriverVerificationService } from './driver-verification.service';

@Module({
  imports: [AuditModule],
  controllers: [DriverVerificationController],
  providers: [DriverVerificationService],
  exports: [DriverVerificationService],
})
export class VerificationModule {}
