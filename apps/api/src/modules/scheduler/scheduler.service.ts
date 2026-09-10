import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { config } from '../../core/config/config';
import { logger } from '../../core/logger';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { PayoutsService } from '../payouts/payouts.service';

/**
 * Lightweight interval scheduler (MVP). BullMQ/Redis workers replace these in
 * the documented scaling path; the inline queue fallback and these timers keep
 * the modular monolith correct without extra infrastructure.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timers: NodeJS.Timeout[] = [];
  private running = new Set<string>();

  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly refunds: RefundsService,
    private readonly payouts: PayoutsService,
  ) {}

  onApplicationBootstrap() {
    if (config().NODE_ENV === 'test') return;
    // Every minute: holds, request timeouts, stale payment reconciliation.
    this.every(60_000, 'booking-sweep', () => this.bookings.sweepExpired());
    this.every(120_000, 'payment-reconcile', () => this.payments.reconcileStale());
    // Every 15 minutes: matured deposit auto-releases.
    this.every(15 * 60_000, 'deposit-release', () => this.refunds.autoReleaseDueDeposits());
    // Hourly: create due payout batches (finance still approves → PAID).
    this.every(60 * 60_000, 'payout-batches', async () => {
      if (config().NODE_ENV === 'production') {
        // In production a dedicated worker with an ops system-user runs this.
        return;
      }
      const res = await this.payouts.createDueBatches('system');
      if (res.created) logger.info(`scheduler: created ${res.created} payout batch(es)`);
    });
  }

  private every(ms: number, name: string, task: () => Promise<unknown>) {
    const run = async () => {
      // Per-job overlap guard (a shared flag let the 60s sweep starve the
      // 15-minute / hourly jobs when boot kickoffs fired together).
      if (this.running.has(name)) return;
      this.running.add(name);
      try {
        await task();
      } catch (e: any) {
        logger.error(`scheduled job ${name} failed`, { error: String(e?.message ?? e) });
      } finally {
        this.running.delete(name);
      }
    };
    const t = setInterval(() => void run(), ms);
    unref(t);
    this.timers.push(t);
    // First run shortly after boot.
    const kickoff = setTimeout(() => void run(), 5_000);
    unref(kickoff);
    this.timers.push(kickoff);
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearInterval(t);
  }
}

function unref(t: NodeJS.Timeout) {
  (t as any).unref?.();
  return t;
}
void Logger;
