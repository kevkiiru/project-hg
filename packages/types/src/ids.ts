// User-friendly public identifiers. Internal PKs are UUIDs (never exposed).
import { randomInt, randomUUID } from 'node:crypto';

// Crockford-ish alphabet without 0/O/1/I/L to avoid transcription errors.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function publicCode(prefix: string, length = 5): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return `${prefix}-${out}`;
}

export const bookingReference = () => publicCode('HG', 5); // HG-8F42K
export const vehicleReference = () => publicCode('HGV', 6);
export const paymentReference = () => publicCode('HGP', 7);
export const payoutReference = () => publicCode('HGO', 7);
export const refundReference = () => publicCode('HGR', 7);
export const quoteReference = () => publicCode('HGQ', 7);
export const conversationReference = () => publicCode('HGC', 6);

export const uuid = (): string => randomUUID();
