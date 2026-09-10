import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminPayoutsController, HostPayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [LedgerModule, AuditModule],
  controllers: [HostPayoutsController, AdminPayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
