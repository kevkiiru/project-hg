import { logger } from '../core/logger';
import type { EmailPort, SmsPort } from './ports';

// Dev/CI adapters. Never enabled in production (boot guard in config).
export class MockSmsAdapter implements SmsPort {
  // Recent dev OTP messages, retrievable via the dev-only API endpoint.
  readonly inbox: Array<{ to: string; body: string; at: Date }> = [];

  async send(to: string, body: string) {
    const record = { to, body, at: new Date() };
    this.inbox.push(record);
    if (this.inbox.length > 200) this.inbox.shift();
    logger.info('[mock-sms] message sent', { to, bodyPreview: body.slice(0, 40) });
    return { providerRef: `mock-sms-${Date.now()}` };
  }
}

export class MockEmailAdapter implements EmailPort {
  readonly inbox: Array<{ to: string; subject: string; html: string; at: Date }> = [];

  async send(to: string, subject: string, html: string) {
    this.inbox.push({ to, subject, html, at: new Date() });
    if (this.inbox.length > 200) this.inbox.shift();
    logger.info('[mock-email] message sent', { to, subject });
    return { providerRef: `mock-email-${Date.now()}` };
  }
}

export const mockSms = new MockSmsAdapter();
export const mockEmail = new MockEmailAdapter();
