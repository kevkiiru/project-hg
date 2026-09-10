import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HostsModule } from '../hosts/hosts.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VerificationModule } from '../verification/verification.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuditModule, HostsModule, VehiclesModule, VerificationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
