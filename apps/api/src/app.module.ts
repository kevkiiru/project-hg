import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CorrelationMiddleware } from './core/http/correlation.middleware';

// Infrastructure / cross-cutting
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { StorageModule } from './modules/storage/storage.module';

// Identity & trust
import { UsersModule } from './modules/users/users.module';
import { VerificationModule } from './modules/verification/verification.module';
import { HostsModule } from './modules/hosts/hosts.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

// Catalogue & availability
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { SearchModule } from './modules/search/search.module';
import { LocationsModule } from './modules/locations/locations.module';

// Commerce
import { QuotesModule } from './modules/quotes/quotes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { PromotionsModule } from './modules/promotions/promotions.module';

// Operations & safety
import { InspectionsModule } from './modules/inspections/inspections.module';
import { DamageModule } from './modules/damage/damage.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { SupportModule } from './modules/support/support.module';

// Admin & analytics
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    // Core
    DbModule,
    IntegrationsModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    StorageModule,
    // Identity
    UsersModule,
    VerificationModule,
    HostsModule,
    MessagingModule,
    ReviewsModule,
    // Catalogue (SearchModule before VehiclesModule: static /search
    // route must register before the dynamic /vehicles/:slug route)
    SearchModule,
    LocationsModule,
    VehiclesModule,
    AvailabilityModule,
    // Commerce
    QuotesModule,
    BookingsModule,
    PaymentsModule,
    WebhooksModule,
    DepositsModule,
    RefundsModule,
    LedgerModule,
    PayoutsModule,
    PromotionsModule,
    // Operations
    InspectionsModule,
    DamageModule,
    IncidentsModule,
    SupportModule,
    // Admin / observability / jobs
    AdminModule,
    AnalyticsModule,
    SchedulerModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
