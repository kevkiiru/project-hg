import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ActorType,
  AdjustmentKind,
  AdjustmentStatus,
  BlockReason,
  BookingMode,
  BookingStatus,
  CancellationTier,
  DamageStatus,
  DepositRule,
  DepositStatus,
  DisputeStatus,
  DisputeSubject,
  DocumentOwnerType,
  DocumentStatus,
  Drivetrain,
  ExtraChargeType,
  FuelPolicy,
  FuelType,
  HoldStatus,
  HostStatus,
  HostType,
  IncidentCategory,
  InspectionType,
  JobStatus,
  LedgerAccountType,
  LedgerDirection,
  LocationKind,
  BusinessMemberStatus,
  MessageKind,
  MileagePolicyType,
  ModerationStatus,
  NotificationChannel,
  NotificationStatus,
  OtpChannel,
  OtpPurpose,
  OutboxStatus,
  AuthTokenType,
  ConversationType,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PayoutStatus,
  PickupOption,
  PriceItemKind,
  PricingRuleKind,
  PromoKind,
  PromoScope,
  QuoteStatus,
  RefundStatus,
  ReportStatus,
  ReviewSubject,
  RiskResolution,
  ScopeType,
  SupportStatus,
  Transmission,
  UserStatus,
  VehicleCategory,
  VehicleStatus,
  VerificationStatus,
  WebhookEventStatus,
  KycIdType,
  RoleName,
} from '@hiregari/types';

type EnumObj = Record<string, string>;
const vals = <T extends EnumObj>(o: T): [T[keyof T], ...T[keyof T][]] => {
  const v = Object.values(o);
  return [v[0]!, ...v.slice(1)] as [T[keyof T], ...T[keyof T][]];
};

export const rolePg = pgEnum('role', vals(RoleName));
export const scopeTypePg = pgEnum('scope_type', vals(ScopeType));
export const userStatusPg = pgEnum('user_status', vals(UserStatus));
export const otpChannelPg = pgEnum('otp_channel', vals(OtpChannel));
export const otpPurposePg = pgEnum('otp_purpose', vals(OtpPurpose));
export const authTokenTypePg = pgEnum('auth_token_type', vals(AuthTokenType));
export const verificationStatusPg = pgEnum('verification_status', vals(VerificationStatus));
export const documentStatusPg = pgEnum('document_status', vals(DocumentStatus));
export const docOwnerPg = pgEnum('document_owner_type', vals(DocumentOwnerType));
export const hostTypePg = pgEnum('host_type', vals(HostType));
export const hostStatusPg = pgEnum('host_status', vals(HostStatus));
export const businessMemberPg = pgEnum('business_member_status', vals(BusinessMemberStatus));
export const kycIdPg = pgEnum('kyc_id_type', vals(KycIdType));
export const riskResolutionPg = pgEnum('risk_resolution', vals(RiskResolution));
export const locationKindPg = pgEnum('location_kind', vals(LocationKind));
export const vehicleCategoryPg = pgEnum('vehicle_category', vals(VehicleCategory));
export const vehicleStatusPg = pgEnum('vehicle_status', vals(VehicleStatus));
export const transmissionPg = pgEnum('transmission', vals(Transmission));
export const fuelTypePg = pgEnum('fuel_type', vals(FuelType));
export const drivetrainPg = pgEnum('drivetrain', vals(Drivetrain));
export const pickupOptionPg = pgEnum('pickup_option', vals(PickupOption));
export const bookingModePg = pgEnum('booking_mode', vals(BookingMode));
export const bookingStatusPg = pgEnum('booking_status', vals(BookingStatus));
export const holdStatusPg = pgEnum('hold_status', vals(HoldStatus));
export const quoteStatusPg = pgEnum('quote_status', vals(QuoteStatus));
export const priceItemKindPg = pgEnum('price_item_kind', vals(PriceItemKind));
export const paymentProviderPg = pgEnum('payment_provider', vals(PaymentProvider));
export const paymentMethodPg = pgEnum('payment_method', vals(PaymentMethod));
export const paymentPurposePg = pgEnum('payment_purpose', vals(PaymentPurpose));
export const paymentStatusPg = pgEnum('payment_status', vals(PaymentStatus));
export const webhookStatusPg = pgEnum('webhook_event_status', vals(WebhookEventStatus));
export const refundStatusPg = pgEnum('refund_status', vals(RefundStatus));
export const depositStatusPg = pgEnum('deposit_status', vals(DepositStatus));
export const depositRulePg = pgEnum('deposit_rule', vals(DepositRule));
export const payoutStatusPg = pgEnum('payout_status', vals(PayoutStatus));
export const mileagePolicyPg = pgEnum('mileage_policy_type', vals(MileagePolicyType));
export const fuelPolicyPg = pgEnum('fuel_policy', vals(FuelPolicy));
export const cancellationTierPg = pgEnum('cancellation_tier', vals(CancellationTier));
export const pricingRuleKindPg = pgEnum('pricing_rule_kind', vals(PricingRuleKind));
export const extraChargePg = pgEnum('extra_charge_type', vals(ExtraChargeType));
export const blockReasonPg = pgEnum('block_reason', vals(BlockReason));
export const inspectionTypePg = pgEnum('inspection_type', vals(InspectionType));
export const adjustmentKindPg = pgEnum('adjustment_kind', vals(AdjustmentKind));
export const adjustmentStatusPg = pgEnum('adjustment_status', vals(AdjustmentStatus));
export const damageStatusPg = pgEnum('damage_status', vals(DamageStatus));
export const disputeStatusPg = pgEnum('dispute_status', vals(DisputeStatus));
export const disputeSubjectPg = pgEnum('dispute_subject', vals(DisputeSubject));
export const incidentCategoryPg = pgEnum('incident_category', vals(IncidentCategory));
export const reviewSubjectPg = pgEnum('review_subject', vals(ReviewSubject));
export const moderationStatusPg = pgEnum('moderation_status', vals(ModerationStatus));
export const reportStatusPg = pgEnum('report_status', vals(ReportStatus));
export const conversationTypePg = pgEnum('conversation_type', vals(ConversationType));
export const messageKindPg = pgEnum('message_kind', vals(MessageKind));
export const notificationChannelPg = pgEnum('notification_channel', vals(NotificationChannel));
export const notificationStatusPg = pgEnum('notification_status', vals(NotificationStatus));
export const outboxStatusPg = pgEnum('outbox_status', vals(OutboxStatus));
export const jobStatusPg = pgEnum('job_status', vals(JobStatus));
export const ledgerDirectionPg = pgEnum('ledger_direction', vals(LedgerDirection));
export const ledgerAccountTypePg = pgEnum('ledger_account_type', vals(LedgerAccountType));
export const actorTypePg = pgEnum('actor_type', vals(ActorType));
export const promoKindPg = pgEnum('promo_kind', vals(PromoKind));
export const promoScopePg = pgEnum('promo_scope', vals(PromoScope));
export const supportStatusPg = pgEnum('support_status', vals(SupportStatus));
