import { Module, OnModuleInit } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Module({
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule implements OnModuleInit {
  constructor(private readonly ledger: LedgerService) {}
  async onModuleInit() {
    for (const code of ['HG_CASH', 'HG_DEPOSIT_LIABILITY', 'HG_COMMISSION', 'HG_TAX_PAYABLE', 'HG_PROMO_EXPENSE']) {
      await this.ledger.ensureAccount(code);
    }
  }
}
