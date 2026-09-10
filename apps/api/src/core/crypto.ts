import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { config } from './config/config';

// ── Passwords: scrypt (built in; no native deps), per-hash salt ──────────────
const SCRYPT_N = 2 ** 15;
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(password, salt, 64, { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$8$1$${salt.toString('base64')}$${dk.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const dk = scryptSync(password, Buffer.from(saltB64, 'base64'), 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  const expected = Buffer.from(hashB64, 'base64');
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}

// ── Opaque tokens (sessions, upload grants) ──────────────────────────────────
export const generateToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generateOtp = (digits = 6): string =>
  String(randomInt(0, 10 ** digits)).padStart(digits, '0');

export const hashOtp = (code: string): string =>
  createHash('sha256').update(code).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ── Field-level encryption for sensitive identity/payout data (AES-256-GCM) ──
function encryptionKey(): Buffer {
  const key = Buffer.from(config().ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be base64-encoded 32 bytes');
  return key;
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1$${iv.toString('base64')}$${tag.toString('base64')}$${ct.toString('base64')}`;
}

export function decryptField(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [version, ivB64, tagB64, ctB64] = payload.split('$');
  if (version !== 'v1') throw new Error('unknown encryption version');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64 ?? '', 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64 ?? '', 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctB64 ?? '', 'base64')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
