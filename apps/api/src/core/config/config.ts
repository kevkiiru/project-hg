import { z } from 'zod';

// boolEnv maps ANY non-empty string (incl. "false") to true —
// parse env booleans explicitly.
const boolEnv = z.preprocess(
  (v) => (typeof v === 'string' ? ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase()) : v),
  z.boolean(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().default('http://localhost:3000'),
  ADMIN_BASE_URL: z.string().default('http://localhost:3002'),
  DEFAULT_CURRENCY: z.string().default('KES'),
  DATABASE_URL: z.string().min(1),

  QUEUE_DRIVER: z.enum(['inline', 'bullmq']).default('inline'),
  REDIS_URL: z.string().optional(),

  SESSION_SECRET: z.string().min(16).default('dev-insecure-session-secret-change-me-now'),
  SESSION_TTL_HOURS: z.coerce.number().default(720),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RATE_LIMIT_PER_HOUR: z.coerce.number().default(5),
  ENCRYPTION_KEY: z
    .string()
    .default('ZGV2LWtleS0zMi1ieXRlcy1sb25nLWxvbmctbG9uZyEhIQ=='),
  CSRF_ENABLED: boolEnv.default(false),
  ADMIN_MFA_REQUIRED: boolEnv.default(true),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),
  GOOGLE_ENABLED: boolEnv.default(false),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('af-south-1'),
  S3_BUCKET_PRIVATE: z.string().default('hiregari-private'),
  S3_BUCKET_PUBLIC: z.string().default('hiregari-public'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().default(300),
  MAX_UPLOAD_MB: z.coerce.number().default(8),

  PAYMENT_DRIVER: z.enum(['mock', 'mpesa-daraja']).default('mock'),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_BASE_URL: z.string().optional(),
  CARD_PROVIDER: z.enum(['mock', 'flutterwave', 'stripe']).default('mock'),
  CARD_PUBLIC_KEY: z.string().optional(),
  CARD_SECRET_KEY: z.string().optional(),
  CARD_WEBHOOK_SECRET: z.string().optional(),

  COMMISSION_BPS: z.coerce.number().default(1500),
  // Optional RENTER-side service fee on rental subtotal. Defaults to 0: the
  // documented model takes COMMISSION_BPS from the host payout. Charging both
  // is a business decision (BLED-001); never switch on without sign-off.
  RENTER_SERVICE_FEE_BPS: z.coerce.number().default(0),
  DEPOSIT_RULE: z.enum(['FIXED', 'PERCENT_OF_TOTAL', 'DAILY_RATE_MULTIPLE']).default('FIXED'),
  DEPOSIT_FIXED_CENTS: z.coerce.number().default(2_000_000),
  DEPOSIT_PERCENT_BPS: z.coerce.number().default(2000),
  DEPOSIT_DAILY_MULTIPLIER_BPS: z.coerce.number().default(200),
  DEPOSIT_RELEASE_HOURS: z.coerce.number().default(48),
  QUOTE_TTL_MINUTES: z.coerce.number().default(15),
  HOLD_TTL_MINUTES: z.coerce.number().default(15),
  HOST_REQUEST_TIMEOUT_MINUTES: z.coerce.number().default(240),
  PAYMENT_WINDOW_MINUTES: z.coerce.number().default(20),
  PAYOUT_COOLDOWN_HOURS: z.coerce.number().default(72),
  MIN_DRIVER_AGE: z.coerce.number().default(23),
  DOC_EXPIRY_REMINDER_DAYS: z.string().default('30,14,3'),
  TAX_BPS: z.coerce.number().default(0),

  SMS_DRIVER: z.enum(['mock', 'twilio', 'africastalking']).default('mock'),
  EMAIL_DRIVER: z.enum(['mock', 'resend', 'postmark']).default('mock'),
  EMAIL_FROM: z.string().default('Hiregari <no-reply@hiregari.dev>'),
  SUPPORT_EMAIL: z.string().default('support@hiregari.dev'),
  SUPPORT_PHONE_E164: z.string().default('+254700000000'),
  SUPPORT_WHATSAPP_E164: z.string().default('+254700000000'),

  MAPS_DRIVER: z.enum(['mock', 'google', 'mapbox']).default('mock'),
  MAPS_API_KEY: z.string().optional(),
  KYC_DRIVER: z.enum(['manual', 'provider']).default('manual'),
  ANALYTICS_DRIVER: z.enum(['noop', 'posthog']).default('noop'),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  RECONCILE_INTERVAL_MINUTES: z.coerce.number().default(30),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().default(8),
  DEMO_SEED: boolEnv.default(false),
  ALLOW_DEMO_SEED: boolEnv.default(false),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast with clear messages; do not leak secret values.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    if (env.SESSION_SECRET.includes('dev-insecure')) throw new Error('SESSION_SECRET must be set in production');
    if (env.PAYMENT_DRIVER === 'mock' || env.CARD_PROVIDER === 'mock') {
      throw new Error('Mock payment drivers are forbidden in production');
    }
    if (env.SMS_DRIVER === 'mock' || env.EMAIL_DRIVER === 'mock') {
      throw new Error('Mock communication drivers are forbidden in production');
    }
    if (env.STORAGE_DRIVER === 'local') {
      throw new Error('Local file storage is forbidden in production (use s3)');
    }
  }
  return env;
}

let cached: Env | undefined;
export const config = (): Env => {
  if (!cached) cached = loadEnv();
  return cached;
};
