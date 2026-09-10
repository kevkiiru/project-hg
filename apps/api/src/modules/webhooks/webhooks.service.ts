import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { PaymentProvider, WebhookEventStatus } from '@hiregari/types';
import { DB, type Db } from '../../db/db.module';
import { paymentWebhookEvents } from '../../db/schema/money';
import { CARD, MPESA, mockCard, mockMpesa } from '../../integrations/integrations.module';
import type { PaymentProviderPort, WebhookOutcome } from '../../integrations/ports';
import { logger } from '../../core/logger';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WebhooksService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(MPESA) private readonly mpesa: PaymentProviderPort,
    @Inject(CARD) private readonly card: PaymentProviderPort,
    private readonly payments: PaymentsService,
  ) {}

  onModuleInit() {
    // In mock mode the provider calls us in-process (simulating its async
    // delivery). Live adapters deliver over the HTTP controller endpoints.
    if (this.mpesa === (mockMpesa as unknown as PaymentProviderPort)) {
      mockMpesa.simulator = async (_p, _ref, outcome) => {
        await this.simulateCallback(PaymentProvider.MPESA, outcome, true);
      };
    }
    if (this.card === (mockCard as unknown as PaymentProviderPort)) {
      mockCard.simulator = async (_p, _ref, outcome) => {
        await this.simulateCallback(PaymentProvider.CARD, outcome, true);
      };
    }
  }

  /** Dev/tests: deliver a provider outcome through the identical idempotent pipeline. */
  async simulateCallback(provider: PaymentProvider, outcome: WebhookOutcome, signatureValid = true) {
    const eventId = `evt_mock_${outcome.providerRef}`;
    return this.processEvent({
      provider,
      eventId,
      signatureValid,
      raw: outcome.raw ?? { mock: true },
      outcome,
    });
  }

  async receive(provider: PaymentProvider, headers: any, rawBody: string) {
    const adapter: PaymentProviderPort = provider === PaymentProvider.MPESA ? this.mpesa : this.card;
    const verification = await adapter.verifyWebhook(headers, rawBody);
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    if (!verification.valid) {
      logger.warn('webhook signature invalid', { provider });
      await this.db.insert(paymentWebhookEvents).values({
        provider,
        providerEventId: verification.providerEventId || `invalid_${Date.now()}`,
        status: WebhookEventStatus.IGNORED,
        signatureValid: false,
        payloadHash,
        rawPayload: rawBody.slice(0, 10_000),
        attempts: 1,
        lastError: 'signature verification failed',
      });
      return { accepted: false };
    }

    const outcome = await adapter.parseWebhook(verification);
    if (!outcome) return { accepted: false };
    return this.processEvent({
      provider,
      eventId: verification.providerEventId,
      signatureValid: true,
      raw: verification.raw,
      outcome,
    });
  }

  private async processEvent(args: {
    provider: PaymentProvider;
    eventId: string;
    signatureValid: boolean;
    raw: any;
    outcome: WebhookOutcome;
  }) {
    const { provider, eventId, signatureValid, raw, outcome } = args;
    const payloadHash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');

    // Idempotency table keyed by provider event id.
    const existing = (
      await this.db
        .select()
        .from(paymentWebhookEvents)
        .where(
          // unique (provider, provider_event_id)
          eq(paymentWebhookEvents.providerEventId, eventId),
        )
    ).filter((e) => e.provider === provider);

    if (existing[0]) {
      if (existing[0].status === WebhookEventStatus.PROCESSED) {
        logger.info('duplicate webhook ignored', { provider, eventId });
        return { accepted: true, duplicate: true };
      }
    } else {
      try {
        await this.db.insert(paymentWebhookEvents).values({
          provider,
          providerEventId: eventId,
          status: WebhookEventStatus.RECEIVED,
          signatureValid,
          payloadHash,
          rawPayload: JSON.stringify(raw).slice(0, 10_000),
          paymentRef: outcome.providerRef,
        });
      } catch (e: any) {
        if (e?.code !== '23505') throw e;
      }
    }

    try {
      const result = await this.payments.applyOutcome(outcome);
      await this.db
        .update(paymentWebhookEvents)
        .set({ status: WebhookEventStatus.PROCESSED, processedAt: new Date(), attempts: (existing[0]?.attempts ?? 0) + 1 })
         .where(and(eq(paymentWebhookEvents.provider, provider), eq(paymentWebhookEvents.providerEventId, eventId)));
      return { accepted: true, ...result };
    } catch (e: any) {
      logger.error('webhook processing failed', { provider, eventId, error: String(e?.message) });
      await this.db
        .update(paymentWebhookEvents)
        .set({
          status: WebhookEventStatus.FAILED,
          attempts: (existing[0]?.attempts ?? 0) + 1,
          lastError: String(e?.message ?? e).slice(0, 1000),
        })
         .where(and(eq(paymentWebhookEvents.provider, provider), eq(paymentWebhookEvents.providerEventId, eventId)));
      return { accepted: false };
    }
  }
}
