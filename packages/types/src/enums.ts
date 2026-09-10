// Canonical enumerations shared across API, web and admin.
// Prisma enums use identical string values so the literals are assignable.

export const UserStatus = {
  REGISTERED: 'REGISTERED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const RoleName = {
  CUSTOMER: 'CUSTOMER',
  HOST: 'HOST',
  HOST_STAFF: 'HOST_STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
  OPERATIONS: 'OPERATIONS',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  VERIFICATION: 'VERIFICATION',
  FINANCE: 'FINANCE',
  CONTENT_MODERATION: 'CONTENT_MODERATION',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const AdminRoles: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.OPERATIONS,
  RoleName.CUSTOMER_SUPPORT,
  RoleName.VERIFICATION,
  RoleName.FINANCE,
  RoleName.CONTENT_MODERATION,
];

export const VerificationStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const DocumentStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const HostType = { INDIVIDUAL: 'INDIVIDUAL', BUSINESS: 'BUSINESS' } as const;
export type HostType = (typeof HostType)[keyof typeof HostType];

export const HostStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type HostStatus = (typeof HostStatus)[keyof typeof HostStatus];

export const BusinessMemberStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REMOVED: 'REMOVED',
} as const;
export type BusinessMemberStatus = (typeof BusinessMemberStatus)[keyof typeof BusinessMemberStatus];

export const VehicleCategory = {
  ECONOMY: 'ECONOMY',
  SEDAN: 'SEDAN',
  SUV: 'SUV',
  FOUR_X_FOUR: 'FOUR_X_FOUR',
  LUXURY: 'LUXURY',
  VAN: 'VAN',
  SAFARI: 'SAFARI',
  ELECTRIC_HYBRID: 'ELECTRIC_HYBRID',
} as const;
export type VehicleCategory = (typeof VehicleCategory)[keyof typeof VehicleCategory];

export const VehicleStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const Transmission = { AUTOMATIC: 'AUTOMATIC', MANUAL: 'MANUAL' } as const;
export type Transmission = (typeof Transmission)[keyof typeof Transmission];

export const FuelType = {
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  HYBRID: 'HYBRID',
  ELECTRIC: 'ELECTRIC',
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export const Drivetrain = { FWD: 'FWD', RWD: 'RWD', AWD: 'AWD', FOUR_WD: 'FOUR_WD' } as const;
export type Drivetrain = (typeof Drivetrain)[keyof typeof Drivetrain];

export const PickupOption = {
  AT_LOCATION: 'AT_LOCATION',
  HOST_DELIVERY: 'HOST_DELIVERY',
  AIRPORT: 'AIRPORT',
  CUSTOM_AREA: 'CUSTOM_AREA',
} as const;
export type PickupOption = (typeof PickupOption)[keyof typeof PickupOption];

export const BookingMode = { REQUEST: 'REQUEST', INSTANT: 'INSTANT' } as const;
export type BookingMode = (typeof BookingMode)[keyof typeof BookingMode];

export const BookingStatus = {
  DRAFT: 'DRAFT',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  PENDING_HOST: 'PENDING_HOST',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  PICKUP_PENDING: 'PICKUP_PENDING',
  ACTIVE: 'ACTIVE',
  RETURN_PENDING: 'RETURN_PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  DISPUTED: 'DISPUTED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const HoldStatus = {
  ACTIVE: 'ACTIVE',
  CONVERTED: 'CONVERTED',
  EXPIRED: 'EXPIRED',
  RELEASED: 'RELEASED',
} as const;
export type HoldStatus = (typeof HoldStatus)[keyof typeof HoldStatus];

export const QuoteStatus = {
  ACTIVE: 'ACTIVE',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const PriceItemKind = {
  RENTAL: 'RENTAL',
  EXTRA: 'EXTRA',
  DELIVERY: 'DELIVERY',
  FEE: 'FEE',
  DISCOUNT: 'DISCOUNT',
  TAX: 'TAX',
  DEPOSIT: 'DEPOSIT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type PriceItemKind = (typeof PriceItemKind)[keyof typeof PriceItemKind];

export const PaymentProvider = { MPESA: 'MPESA', CARD: 'CARD' } as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentMethod = {
  MPESA_STK: 'MPESA_STK',
  MPESA_MANUAL: 'MPESA_MANUAL',
  CARD_TOKENIZED: 'CARD_TOKENIZED',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentPurpose = {
  RENTAL: 'RENTAL',
  DEPOSIT: 'DEPOSIT',
  EXTENSION: 'EXTENSION',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose];

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const DepositStatus = {
  REQUIRED: 'REQUIRED',
  PENDING: 'PENDING',
  HELD: 'HELD',
  COLLECTED: 'COLLECTED',
  RELEASE_PENDING: 'RELEASE_PENDING',
  RELEASED: 'RELEASED',
  PARTIALLY_DEDUCTED: 'PARTIALLY_DEDUCTED',
  DEDUCTED: 'DEDUCTED',
  DISPUTED: 'DISPUTED',
  REFUNDED: 'REFUNDED',
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const DepositRule = {
  FIXED: 'FIXED',
  PERCENT_OF_TOTAL: 'PERCENT_OF_TOTAL',
  DAILY_RATE_MULTIPLE: 'DAILY_RATE_MULTIPLE',
} as const;
export type DepositRule = (typeof DepositRule)[keyof typeof DepositRule];

export const PayoutStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  HELD: 'HELD',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const MileagePolicyType = {
  UNLIMITED: 'UNLIMITED',
  PER_DAY: 'PER_DAY',
  PER_BOOKING: 'PER_BOOKING',
} as const;
export type MileagePolicyType = (typeof MileagePolicyType)[keyof typeof MileagePolicyType];

export const FuelPolicy = { SAME_TO_SAME: 'SAME_TO_SAME', FULL_TO_FULL: 'FULL_TO_FULL' } as const;
export type FuelPolicy = (typeof FuelPolicy)[keyof typeof FuelPolicy];

export const CancellationTier = {
  FLEXIBLE: 'FLEXIBLE',
  MODERATE: 'MODERATE',
  STRICT: 'STRICT',
  CUSTOM: 'CUSTOM',
} as const;
export type CancellationTier = (typeof CancellationTier)[keyof typeof CancellationTier];

export const BlockReason = {
  MANUAL: 'MANUAL',
  MAINTENANCE: 'MAINTENANCE',
  BOOKING_BUFFER: 'BOOKING_BUFFER',
} as const;
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

export const InspectionType = { PICKUP: 'PICKUP', RETURN: 'RETURN' } as const;
export type InspectionType = (typeof InspectionType)[keyof typeof InspectionType];

export const AdjustmentKind = {
  LATE: 'LATE',
  EXCESS_MILEAGE: 'EXCESS_MILEAGE',
  FUEL: 'FUEL',
  DAMAGE: 'DAMAGE',
  GOODWILL: 'GOODWILL',
  OTHER: 'OTHER',
} as const;
export type AdjustmentKind = (typeof AdjustmentKind)[keyof typeof AdjustmentKind];

export const AdjustmentStatus = {
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  DISPUTED: 'DISPUTED',
  FINAL: 'FINAL',
} as const;
export type AdjustmentStatus = (typeof AdjustmentStatus)[keyof typeof AdjustmentStatus];

export const DamageStatus = {
  REPORTED: 'REPORTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  ADJUSTED: 'ADJUSTED',
  CHARGED: 'CHARGED',
} as const;
export type DamageStatus = (typeof DamageStatus)[keyof typeof DamageStatus];

export const DisputeStatus = {
  OPEN: 'OPEN',
  AWAITING_CUSTOMER: 'AWAITING_CUSTOMER',
  AWAITING_HOST: 'AWAITING_HOST',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const IncidentCategory = {
  ACCIDENT: 'ACCIDENT',
  BREAKDOWN: 'BREAKDOWN',
  THEFT: 'THEFT',
  SAFETY: 'SAFETY',
  OTHER: 'OTHER',
} as const;
export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory];

export const ReviewSubject = { HOST: 'HOST', RENTER: 'RENTER', VEHICLE: 'VEHICLE' } as const;
export type ReviewSubject = (typeof ReviewSubject)[keyof typeof ReviewSubject];

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  SUPPRESSED: 'SUPPRESSED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const WebhookEventStatus = {
  RECEIVED: 'RECEIVED',
  PROCESSED: 'PROCESSED',
  IGNORED: 'IGNORED',
  FAILED: 'FAILED',
} as const;
export type WebhookEventStatus = (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

export const KycIdType = {
  KENYAN_ID: 'KENYAN_ID',
  PASSPORT: 'PASSPORT',
  ALIEN_ID: 'ALIEN_ID',
} as const;
export type KycIdType = (typeof KycIdType)[keyof typeof KycIdType];

export const SearchSort = {
  RECOMMENDED: 'RECOMMENDED',
  PRICE_ASC: 'PRICE_ASC',
  PRICE_DESC: 'PRICE_DESC',
  RATING: 'RATING',
  NEWEST: 'NEWEST',
} as const;
export type SearchSort = (typeof SearchSort)[keyof typeof SearchSort];

export const LedgerDirection = { DEBIT: 'DEBIT', CREDIT: 'CREDIT' } as const;
export type LedgerDirection = (typeof LedgerDirection)[keyof typeof LedgerDirection];

export const LedgerAccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE',
} as const;
export type LedgerAccountType = (typeof LedgerAccountType)[keyof typeof LedgerAccountType];

// ── Additional operational enums ──────────────────────────────────────────
export const ScopeType = { GLOBAL: 'GLOBAL', BUSINESS: 'BUSINESS', HOST: 'HOST' } as const;
export type ScopeType = (typeof ScopeType)[keyof typeof ScopeType];

export const OtpChannel = { SMS: 'SMS', EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP' } as const;
export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

export const OtpPurpose = {
  LOGIN: 'LOGIN',
  VERIFY_PHONE: 'VERIFY_PHONE',
  VERIFY_EMAIL: 'VERIFY_EMAIL',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export const AuthTokenType = { EMAIL_VERIFY: 'EMAIL_VERIFY', PASSWORD_RESET: 'PASSWORD_RESET' } as const;
export type AuthTokenType = (typeof AuthTokenType)[keyof typeof AuthTokenType];

export const DocumentOwnerType = { HOST: 'HOST', BUSINESS: 'BUSINESS', DRIVER: 'DRIVER' } as const;
export type DocumentOwnerType = (typeof DocumentOwnerType)[keyof typeof DocumentOwnerType];

export const RiskResolution = { OPEN: 'OPEN', REVIEWED: 'REVIEWED', CLEARED: 'CLEARED', ESCALATED: 'ESCALATED' } as const;
export type RiskResolution = (typeof RiskResolution)[keyof typeof RiskResolution];

export const LocationKind = {
  CITY: 'CITY',
  NEIGHBOURHOOD: 'NEIGHBOURHOOD',
  AIRPORT: 'AIRPORT',
  REGION: 'REGION',
} as const;
export type LocationKind = (typeof LocationKind)[keyof typeof LocationKind];

export const PricingRuleKind = { DATE_OVERRIDE: 'DATE_OVERRIDE', SEASONAL: 'SEASONAL' } as const;
export type PricingRuleKind = (typeof PricingRuleKind)[keyof typeof PricingRuleKind];

export const ExtraChargeType = { DAILY: 'DAILY', ONE_OFF: 'ONE_OFF' } as const;
export type ExtraChargeType = (typeof ExtraChargeType)[keyof typeof ExtraChargeType];

export const PromoKind = { PERCENT: 'PERCENT', FIXED: 'FIXED' } as const;
export type PromoKind = (typeof PromoKind)[keyof typeof PromoKind];

export const PromoScope = { GLOBAL: 'GLOBAL', HOST: 'HOST', VEHICLE: 'VEHICLE' } as const;
export type PromoScope = (typeof PromoScope)[keyof typeof PromoScope];

export const ConversationType = { BOOKING: 'BOOKING', LISTING: 'LISTING', SUPPORT: 'SUPPORT' } as const;
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];

export const MessageKind = { TEXT: 'TEXT', IMAGE: 'IMAGE', SYSTEM: 'SYSTEM' } as const;
export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];

export const ModerationStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', HIDDEN: 'HIDDEN' } as const;
export type ModerationStatus = (typeof ModerationStatus)[keyof typeof ModerationStatus];

export const ReportStatus = { OPEN: 'OPEN', RESOLVED: 'RESOLVED' } as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const OutboxStatus = { PENDING: 'PENDING', DISPATCHED: 'DISPATCHED', DEAD: 'DEAD' } as const;
export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

export const JobStatus = { RUNNING: 'RUNNING', DONE: 'DONE', FAILED: 'FAILED' } as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ActorType = {
  CUSTOMER: 'CUSTOMER',
  HOST: 'HOST',
  HOST_STAFF: 'HOST_STAFF',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
  PROVIDER: 'PROVIDER',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const SupportStatus = {
  OPEN: 'OPEN',
  WAITING: 'WAITING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type SupportStatus = (typeof SupportStatus)[keyof typeof SupportStatus];

export const DisputeSubject = {
  DAMAGE: 'DAMAGE',
  DEPOSIT: 'DEPOSIT',
  REFUND: 'REFUND',
  VEHICLE_CONDITION: 'VEHICLE_CONDITION',
  OTHER: 'OTHER',
} as const;
export type DisputeSubject = (typeof DisputeSubject)[keyof typeof DisputeSubject];
