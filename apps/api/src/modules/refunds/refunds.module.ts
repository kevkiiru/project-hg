import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminRefundsController, RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [IntegrationsModule, LedgerModule],
  controllers: [RefundsController, AdminRefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
