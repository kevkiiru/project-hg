import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminIncidentsController, IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [BookingsModule, NotificationsModule],
  controllers: [IncidentsController, AdminIncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
