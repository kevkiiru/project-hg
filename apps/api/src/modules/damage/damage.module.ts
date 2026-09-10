import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BookingsModule } from '../bookings/bookings.module';
import { DepositsModule } from '../deposits/deposits.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RefundsModule } from '../refunds/refunds.module';
import {
  AdminDamageController,
  DamageActionsController,
  DamageController,
  HostDamageController,
} from './damage.controller';
import { DamageService } from './damage.service';

@Module({
  imports: [BookingsModule, DepositsModule, RefundsModule, LedgerModule, AuditModule],
  controllers: [DamageController, DamageActionsController, HostDamageController, AdminDamageController],
  providers: [DamageService],
  exports: [DamageService],
})
export class DamageModule {}
