// Integration ports (hexagonal). Adapters are selected by config; mock
// adapters are boot-blocked in production (see core/config).

export interface PaymentInitiateRequest {
  paymentId: string;
  reference: string;
  amountCents: number;
  currency: string;
  description: string;
  phoneE164?: string;
  customerEmail?: string;
  callbackUrl: string;
}

export interface PaymentInitiateResult {
  providerRef?: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'PROCESSING';
  raw?: Record<string, unknown>;
}

export interface WebhookVerification {
  valid: boolean;
  providerEventId: string;
  raw: any;
}

export interface WebhookOutcome {
  providerRef: string;
  result: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PROCESSING' | 'IGNORE';
  amountCents?: number;
  failureCode?: string;
  failureMessage?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProviderPort {
  readonly name: string;
  initiate(req: PaymentInitiateRequest): Promise<PaymentInitiateResult>;
  verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): Promise<WebhookVerification>;
  parseWebhook(verification: WebhookVerification): Promise<WebhookOutcome | null>;
  queryStatus(providerRef: string): Promise<WebhookOutcome | null>;
  refund?(providerRef: string, amountCents: number, reason: string): Promise<{ providerRef: string }>;
}

export interface SmsPort {
  send(to: string, body: string, metadata?: { template?: string }): Promise<{ providerRef?: string }>;
}
export interface EmailPort {
  send(to: string, subject: string, html: string, text?: string): Promise<{ providerRef?: string }>;
}

export interface GeoPlace {
  lat: number;
  lng: number;
  label: string;
}
export interface GeoPort {
  geocode(query: string): Promise<GeoPlace | null>;
  distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number;
}

export interface KycSubmission {
  idType: string;
  idNumber: string;
  legalName: string;
  dob?: Date | null;
  licenceNumber?: string | null;
}
export interface KycResult {
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW';
  providerReference?: string;
  reasons?: string[];
}
export interface KycPort {
  submit(submission: KycSubmission): Promise<KycResult>;
}

export interface AnalyticsPort {
  track(event: string, distinctId: string, props?: Record<string, unknown>): Promise<void> | void;
}
