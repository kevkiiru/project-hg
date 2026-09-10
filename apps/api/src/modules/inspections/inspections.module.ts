import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { DepositsModule } from '../deposits/deposits.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [BookingsModule, DepositsModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
