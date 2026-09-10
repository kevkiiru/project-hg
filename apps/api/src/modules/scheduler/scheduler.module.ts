import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { RefundsModule } from '../refunds/refunds.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [BookingsModule, PaymentsModule, RefundsModule, PayoutsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
