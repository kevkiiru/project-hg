import { Global, Module } from '@nestjs/common';
import { config } from '../core/config/config';
import { createStorage, type StoragePort } from './storage';
import { mockMpesa, mockCard } from './mock-payments';
import { MpesaDarajaAdapter } from './mpesa-daraja';
import { mockSms, mockEmail } from './mock-communications';
import { ManualKycAdapter, MockGeoAdapter, NoopAnalytics } from './mock-other';
import type { AnalyticsPort, EmailPort, GeoPort, KycPort, PaymentProviderPort, SmsPort } from './ports';

export const SMS = Symbol('SMS');
export const EMAIL = Symbol('EMAIL');
export const MPESA = Symbol('MPESA');
export const CARD = Symbol('CARD');
export const STORAGE = Symbol('STORAGE');
export const GEO = Symbol('GEO');
export const KYC = Symbol('KYC');
export const ANALYTICS = Symbol('ANALYTICS');

function mpesaAdapter(): PaymentProviderPort {
  const c = config();
  if (c.PAYMENT_DRIVER === 'mpesa-daraja') return new MpesaDarajaAdapter();
  return mockMpesa as unknown as PaymentProviderPort;
}

function cardAdapter(): PaymentProviderPort {
  return mockCard as unknown as PaymentProviderPort;
}

@Global()
@Module({
  providers: [
    { provide: SMS, useValue: mockSms as unknown as SmsPort },
    { provide: EMAIL, useValue: mockEmail as unknown as EmailPort },
    { provide: MPESA, useFactory: mpesaAdapter },
    { provide: CARD, useFactory: cardAdapter },
    { provide: STORAGE, useFactory: (): StoragePort => createStorage() },
    { provide: GEO, useValue: new MockGeoAdapter() as unknown as GeoPort },
    { provide: KYC, useValue: new ManualKycAdapter() as unknown as KycPort },
    { provide: ANALYTICS, useValue: new NoopAnalytics() as unknown as AnalyticsPort },
  ],
  exports: [SMS, EMAIL, MPESA, CARD, STORAGE, GEO, KYC, ANALYTICS],
})
export class IntegrationsModule {}

export { mockMpesa, mockCard, mockSms, mockEmail };
