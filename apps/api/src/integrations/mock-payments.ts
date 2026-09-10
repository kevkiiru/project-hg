import { createHmac } from 'node:crypto';
import { logger } from '../core/logger';
import type {
  PaymentInitiateRequest,
  PaymentInitiateResult,
  PaymentProviderPort,
  WebhookOutcome,
  WebhookVerification,
} from './ports';

type Simulator = (provider: 'MPESA' | 'CARD', providerRef: string, outcome: WebhookOutcome) => Promise<void>;

// Simulates an async M-Pesa STK push: a delayed, signed-equivalent callback.
class MockMpesaAdapter implements PaymentProviderPort {
  readonly name = 'mock-mpesa';
  simulator: Simulator | null = null;
  private store = new Map<string, PaymentInitiateRequest>();

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResult> {
    const providerRef = `MOCK_STK_${req.reference}`;
    this.store.set(providerRef, req);
    logger.info('[mock-mpesa] STK push initiated', { phone: req.phoneE164, amountCents: req.amountCents });

    if (process.env.MOCK_PAYMENT_AUTO !== '0') {
      const shouldFail = req.description.startsWith('[FAIL]');
      setTimeout(() => {
        void this.simulator?.('MPESA', providerRef, {
          providerRef,
          result: shouldFail ? 'FAILED' : 'SUCCESS',
          amountCents: req.amountCents,
          failureCode: shouldFail ? 'SIMULATED_FAILURE' : undefined,
          failureMessage: shouldFail ? 'Customer did not enter PIN.' : undefined,
          raw: { mock: true },
        });
      }, 3500);
    }
    return { providerRef, status: 'PENDING', raw: { CheckoutRequestID: providerRef } };
  }

  // Daraja does not sign callbacks; authenticity is established by re-querying
  // the provider. The mock therefore only normalizes the payload.
  async verifyWebhook(_headers: any, rawBody: string): Promise<WebhookVerification> {
    try {
      const raw = JSON.parse(rawBody);
      const checkoutId = raw?.Body?.stkCallback?.CheckoutRequestID;
      return { valid: !!checkoutId, providerEventId: checkoutId ?? `evt_${Date.now()}`, raw };
    } catch {
      return { valid: false, providerEventId: 'invalid', raw: null };
    }
  }

  async parseWebhook(v: WebhookVerification): Promise<WebhookOutcome | null> {
    if (!v.valid) return null;
    const cb = v.raw.Body.stkCallback;
    const resultCode = String(cb.ResultCode);
    const items = cb.CallbackMetadata?.Item ?? [];
    const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
    return {
      providerRef: cb.CheckoutRequestID,
      result: resultCode === '0' ? 'SUCCESS' : 'FAILED',
      amountCents: amount ? Math.round(Number(amount) * 100) : undefined,
      failureCode: resultCode === '0' ? undefined : resultCode,
      failureMessage: resultCode === '0' ? undefined : cb.ResultDesc,
      raw: v.raw,
    };
  }

  async queryStatus(ref: string): Promise<WebhookOutcome | null> {
    return this.store.has(ref) ? { providerRef: ref, result: 'PENDING' as any, raw: { mock: true } } : null;
  }

  async refund(providerRef: string, amountCents: number) {
    return { providerRef: `MOCK_REV_${providerRef}_${amountCents}` };
  }
}

// Simulates a tokenized card provider with HMAC webhooks (PCI scope zero:
// only a tokenized checkout reference ever touches Hiregari).
class MockCardAdapter implements PaymentProviderPort {
  readonly name = 'mock-card';
  simulator: Simulator | null = null;
  private store = new Map<string, PaymentInitiateRequest>();
  private secret = () => process.env.CARD_WEBHOOK_SECRET || 'mock-card-secret';

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResult> {
    const providerRef = `MOCK_CARD_${req.reference}`;
    this.store.set(providerRef, req);
    const checkoutUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/checkout/mock-card?token=${providerRef}`;
    logger.info('[mock-card] hosted checkout created', { amountCents: req.amountCents });
    if (process.env.MOCK_PAYMENT_AUTO !== '0') {
      setTimeout(() => {
        const shouldFail = req.description.startsWith('[FAIL]');
        void this.simulator?.('CARD', providerRef, {
          providerRef,
          result: shouldFail ? 'FAILED' : 'SUCCESS',
          amountCents: req.amountCents,
          failureCode: shouldFail ? 'CARD_DECLINED' : undefined,
          failureMessage: shouldFail ? 'Card declined by issuer.' : undefined,
          raw: { mock: true },
        });
      }, 3500);
    }
    return { providerRef, checkoutUrl, status: 'PENDING', raw: { token: providerRef } };
  }

  signPayload(rawBody: string) {
    return createHmac('sha256', this.secret()).update(rawBody).digest('hex');
  }

  async verifyWebhook(headers: any, rawBody: string): Promise<WebhookVerification> {
    const expected = createHmac('sha256', this.secret()).update(rawBody).digest('hex');
    const provided = headers['x-card-signature'] ?? headers['X-Card-Signature'];
    const valid = !!provided && provided === expected;
    const raw = JSON.parse(rawBody);
    return { valid, providerEventId: raw.eventId, raw };
  }

  async parseWebhook(v: WebhookVerification): Promise<WebhookOutcome | null> {
    if (!v.valid) return null;
    const raw = v.raw;
    return {
      providerRef: raw.providerRef,
      result: raw.result,
      amountCents: raw.amountCents,
      failureCode: raw.failureCode,
      failureMessage: raw.failureMessage,
      raw,
    };
  }

  async queryStatus(ref: string): Promise<WebhookOutcome | null> {
    return this.store.has(ref) ? { providerRef: ref, result: 'PROCESSING' as any, raw: { mock: true } } : null;
  }

  async refund(providerRef: string, amountCents: number) {
    return { providerRef: `MOCK_CARD_REV_${providerRef}_${amountCents}` };
  }
}

export const mockMpesa = new MockMpesaAdapter();
export const mockCard = new MockCardAdapter();
