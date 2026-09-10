import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AvailabilityModule } from '../availability/availability.module';
import { DepositsModule } from '../deposits/deposits.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MessagingModule } from '../messaging/messaging.module';
import { QuotesModule } from '../quotes/quotes.module';
import { RefundsModule } from '../refunds/refunds.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VerificationModule } from '../verification/verification.module';
import { BookingsController, HostBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    VehiclesModule,
    AvailabilityModule,
    QuotesModule,
    DepositsModule,
    RefundsModule,
    VerificationModule,
    MessagingModule,
    AuditModule,
    LedgerModule,
  ],
  controllers: [BookingsController, HostBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
