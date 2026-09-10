// User-safe error codes. Messages are customer-safe; details aid correction.
export const ErrorCode = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  MFA_REQUIRED: 'MFA_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  VEHICLE_NOT_AVAILABLE: 'VEHICLE_NOT_AVAILABLE',
  ILLEGAL_TRANSITION: 'ILLEGAL_BOOKING_TRANSITION',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  HOST_NOT_APPROVED: 'HOST_NOT_APPROVED',
  VEHICLE_NOT_APPROVED: 'VEHICLE_NOT_APPROVED',
  DOCUMENT_EXPIRED: 'DOCUMENT_EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  IDEMPOTENCY_REPLAY_MISMATCH: 'IDEMPOTENCY_REPLAY_MISMATCH',
  UPLOAD_REJECTED: 'UPLOAD_REJECTED',
  PROMO_INVALID: 'PROMO_INVALID',
  DEPOSIT_REQUIRED: 'DEPOSIT_REQUIRED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { path: string; message: string }[],
    public readonly internalDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string, details?: any) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'Please sign in to continue.', code: string = ErrorCode.UNAUTHENTICATED) =>
  new AppError(401, code, message);
export const forbidden = (message = 'You do not have permission to perform this action.') =>
  new AppError(403, ErrorCode.FORBIDDEN, message);
export const notFound = (what = 'Resource') => new AppError(404, ErrorCode.NOT_FOUND, `${what} was not found.`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const gone = (code: string, message: string) => new AppError(410, code, message);
export const unprocessable = (code: string, message: string, details?: any) =>
  new AppError(422, code, message, details);
export const rateLimited = (message = 'Too many attempts. Please wait a moment and try again.') =>
  new AppError(429, ErrorCode.RATE_LIMITED, message);
export const validationError = (details: { path: string; message: string }[]) =>
  new AppError(400, ErrorCode.VALIDATION, 'Some details need correcting before we can continue.', details);
