import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';

@Module({
  imports: [AuditModule],
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
