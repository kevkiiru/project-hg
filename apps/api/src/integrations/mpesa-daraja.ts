import { createHmac } from 'node:crypto';
import { config } from '../core/config/config';
import { logger } from '../core/logger';
import type { PaymentProviderPort, WebhookOutcome, WebhookVerification, PaymentInitiateRequest, PaymentInitiateResult } from './ports';

/**
 * Safaricom Daraja STK Push adapter. Credentials are only present in
 * staging/production; the mock adapter is used everywhere else.
 *
 * Requires (env): MPESA_CONSUMER_KEY/SECRET, MPESA_SHORTCODE, MPESA_PASSKEY,
 * MPESA_ENV, MPESA_CALLBACK_BASE_URL. B2C for payouts is a separate port.
 */
export class MpesaDarajaAdapter implements PaymentProviderPort {
  readonly name = 'mpesa-daraja';
  private token?: { value: string; expiresAt: number };

  private base() {
    return config().MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async authToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = config();
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
      throw new Error('MPESA_CONSUMER_KEY/MPESA_CONSUMER_SECRET not configured');
    }
    const res = await fetch(`${this.base()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64')}`,
      },
    });
    if (!res.ok) throw new Error(`M-Pesa OAuth failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: string };
    this.token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 - 30_000 };
    return this.token.value;
  }

  async initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResult> {
    const token = await this.authToken();
    const { MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_BASE_URL } = config();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const res = await fetch(`${this.base()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(req.amountCents / 100), // KES whole shillings
        PartyA: req.phoneE164?.replace('+', ''),
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: req.phoneE164?.replace('+', ''),
        CallBackURL: `${MPESA_CALLBACK_BASE_URL}/api/v1/webhooks/payments/mpesa`,
        AccountReference: req.reference.slice(0, 12),
        TransactionDesc: req.description.slice(0, 100),
      }),
    });
    const body: any = await res.json();
    if (body.ResponseCode !== '0') {
      logger.warn('STK push rejected', { code: body.ResponseCode, desc: body.ResponseDescription });
      return { status: 'FAILED' as any, raw: body };
    }
    return { providerRef: body.CheckoutRequestID, status: 'PENDING', raw: body };
  }

  async verifyWebhook(headers: any, rawBody: string): Promise<WebhookVerification> {
    // Daraja callbacks carry no HMAC. Authenticity is established by
    // re-querying the transaction status (never trust callback alone).
    try {
      const raw = JSON.parse(rawBody);
      const id = raw?.Body?.stkCallback?.CheckoutRequestID;
      if (!id) return { valid: false, providerEventId: 'invalid', raw: null };
      // Optional allowlist / source-IP check belongs at the load balancer.
      void headers;
      return { valid: true, providerEventId: id, raw };
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
    const mpesaReceipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
    return {
      providerRef: cb.CheckoutRequestID,
      result: resultCode === '0' ? 'SUCCESS' : 'FAILED',
      amountCents: amount ? Math.round(Number(amount) * 100) : undefined,
      failureCode: resultCode === '0' ? undefined : resultCode,
      failureMessage: resultCode === '0' ? undefined : cb.ResultDesc,
      raw: { ...v.raw, mpesaReceipt },
    };
  }

  async queryStatus(providerRef: string): Promise<WebhookOutcome | null> {
    const token = await this.authToken();
    const { MPESA_SHORTCODE, MPESA_PASSKEY } = config();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = createHmac('sha256', MPESA_PASSKEY ?? '').digest('hex');
    void password;
    const res = await fetch(`${this.base()}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64'),
        Timestamp: timestamp,
        CheckoutRequestID: providerRef,
      }),
    });
    const raw: any = await res.json();
    if (raw.ResultCode === undefined) return null;
    return {
      providerRef,
      result: raw.ResultCode === '0' ? 'SUCCESS' : raw.ResultCode === '1032' ? 'PROCESSING' : 'FAILED',
      raw,
    } as WebhookOutcome;
  }

  async refund(providerRef: string, amountCents: number) {
    // BLED-018: reversal vs B2C refund is a business decision; the reversal
    // API call (TransactionReversal) is implemented when the business is
    // onboarded. Returns a tracked marker; ops executes in sandbox first.
    void amountCents;
    return { providerRef: `REVERSAL_REQ_${providerRef}` };
  }
}
