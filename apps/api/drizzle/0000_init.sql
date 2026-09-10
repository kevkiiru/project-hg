CREATE TYPE "public"."actor_type" AS ENUM('CUSTOMER', 'HOST', 'HOST_STAFF', 'ADMIN', 'SYSTEM', 'PROVIDER');--> statement-breakpoint
CREATE TYPE "public"."adjustment_kind" AS ENUM('LATE', 'EXCESS_MILEAGE', 'FUEL', 'DAMAGE', 'GOODWILL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."adjustment_status" AS ENUM('PROPOSED', 'APPROVED', 'DISPUTED', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."auth_token_type" AS ENUM('EMAIL_VERIFY', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."block_reason" AS ENUM('MANUAL', 'MAINTENANCE', 'BOOKING_BUFFER');--> statement-breakpoint
CREATE TYPE "public"."booking_mode" AS ENUM('REQUEST', 'INSTANT');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('DRAFT', 'AWAITING_VERIFICATION', 'PENDING_HOST', 'PAYMENT_PENDING', 'CONFIRMED', 'PICKUP_PENDING', 'ACTIVE', 'RETURN_PENDING', 'COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."business_member_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."cancellation_tier" AS ENUM('FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('BOOKING', 'LISTING', 'SUPPORT');--> statement-breakpoint
CREATE TYPE "public"."damage_status" AS ENUM('REPORTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'ADJUSTED', 'CHARGED');--> statement-breakpoint
CREATE TYPE "public"."deposit_rule" AS ENUM('FIXED', 'PERCENT_OF_TOTAL', 'DAILY_RATE_MULTIPLE');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('REQUIRED', 'PENDING', 'HELD', 'COLLECTED', 'RELEASE_PENDING', 'RELEASED', 'PARTIALLY_DEDUCTED', 'DEDUCTED', 'DISPUTED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'AWAITING_CUSTOMER', 'AWAITING_HOST', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."dispute_subject" AS ENUM('DAMAGE', 'DEPOSIT', 'REFUND', 'VEHICLE_CONDITION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."document_owner_type" AS ENUM('HOST', 'BUSINESS', 'DRIVER');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."drivetrain" AS ENUM('FWD', 'RWD', 'AWD', 'FOUR_WD');--> statement-breakpoint
CREATE TYPE "public"."extra_charge_type" AS ENUM('DAILY', 'ONE_OFF');--> statement-breakpoint
CREATE TYPE "public"."fuel_policy" AS ENUM('SAME_TO_SAME', 'FULL_TO_FULL');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('ACTIVE', 'CONVERTED', 'EXPIRED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."host_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."host_type" AS ENUM('INDIVIDUAL', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."incident_category" AS ENUM('ACCIDENT', 'BREAKDOWN', 'THEFT', 'SAFETY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('PICKUP', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('RUNNING', 'DONE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."kyc_id_type" AS ENUM('KENYAN_ID', 'PASSPORT', 'ALIEN_ID');--> statement-breakpoint
CREATE TYPE "public"."ledger_account_type" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."ledger_direction" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."location_kind" AS ENUM('CITY', 'NEIGHBOURHOOD', 'AIRPORT', 'REGION');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('TEXT', 'IMAGE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."mileage_policy_type" AS ENUM('UNLIMITED', 'PER_DAY', 'PER_BOOKING');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('PENDING', 'APPROVED', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."otp_channel" AS ENUM('SMS', 'EMAIL', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('LOGIN', 'VERIFY_PHONE', 'VERIFY_EMAIL');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'DISPATCHED', 'DEAD');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('MPESA_STK', 'MPESA_MANUAL', 'CARD_TOKENIZED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('MPESA', 'CARD');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('RENTAL', 'DEPOSIT', 'EXTENSION', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'HELD');--> statement-breakpoint
CREATE TYPE "public"."pickup_option" AS ENUM('AT_LOCATION', 'HOST_DELIVERY', 'AIRPORT', 'CUSTOM_AREA');--> statement-breakpoint
CREATE TYPE "public"."price_item_kind" AS ENUM('RENTAL', 'EXTRA', 'DELIVERY', 'FEE', 'DISCOUNT', 'TAX', 'DEPOSIT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."pricing_rule_kind" AS ENUM('DATE_OVERRIDE', 'SEASONAL');--> statement-breakpoint
CREATE TYPE "public"."promo_kind" AS ENUM('PERCENT', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."promo_scope" AS ENUM('GLOBAL', 'HOST', 'VEHICLE');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('ACTIVE', 'CONSUMED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."review_subject" AS ENUM('HOST', 'RENTER', 'VEHICLE');--> statement-breakpoint
CREATE TYPE "public"."risk_resolution" AS ENUM('OPEN', 'REVIEWED', 'CLEARED', 'ESCALATED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CUSTOMER', 'HOST', 'HOST_STAFF', 'SUPER_ADMIN', 'OPERATIONS', 'CUSTOMER_SUPPORT', 'VERIFICATION', 'FINANCE', 'CONTENT_MODERATION');--> statement-breakpoint
CREATE TYPE "public"."scope_type" AS ENUM('GLOBAL', 'BUSINESS', 'HOST');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('OPEN', 'WAITING', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('AUTOMATIC', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('REGISTERED', 'ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."vehicle_category" AS ENUM('ECONOMY', 'SEDAN', 'SUV', 'FOUR_X_FOUR', 'LUXURY', 'VAN', 'SAFARI', 'ELECTRIC_HYBRID');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('NOT_STARTED', 'PENDING', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"label" text,
	"country" text DEFAULT 'KE' NOT NULL,
	"county" text,
	"city" text,
	"neighbourhood" text,
	"street" text,
	"landmark" text,
	"postal_code" text,
	"lat" double precision,
	"lng" double precision,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "auth_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"version" text NOT NULL,
	"granted" boolean NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"legal_first_name" text DEFAULT '' NOT NULL,
	"legal_last_name" text DEFAULT '' NOT NULL,
	"dob" timestamp with time zone,
	"nationality" text,
	"country_of_residence" text,
	"photo_object_key" text,
	"verification_status" "verification_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "driver_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_profile_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"legal_first_name" text DEFAULT '' NOT NULL,
	"legal_last_name" text DEFAULT '' NOT NULL,
	"dob" timestamp with time zone,
	"nationality" text,
	"id_type" "kyc_id_type",
	"id_number_enc" text,
	"licence_number_enc" text,
	"licence_country" text,
	"licence_issued_at" timestamp with time zone,
	"licence_expires_at" timestamp with time zone,
	"selfie_object_key" text,
	"effective_expiry_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reasons" text[] DEFAULT '{}' NOT NULL,
	"provider_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_verifications_customer_profile_id_unique" UNIQUE("customer_profile_id")
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel" "otp_channel" NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"to" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"booking_id" uuid,
	"type" text NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"resolution" "risk_resolution" DEFAULT 'OPEN' NOT NULL,
	"reviewer_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"scope_type" "scope_type" DEFAULT 'GLOBAL' NOT NULL,
	"scope_id" uuid,
	"granted_by_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"csrf_secret" text,
	"user_agent" text,
	"ip" text,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mfa_verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_normalized" text,
	"phone_e164" text,
	"password_hash" text,
	"google_subject" text,
	"apple_subject" text,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"avatar_object_key" text,
	"status" "user_status" DEFAULT 'REGISTERED' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"mfa_secret_enc" text,
	"mfa_enrolled_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_normalized_unique" UNIQUE("email_normalized"),
	CONSTRAINT "users_phone_e164_unique" UNIQUE("phone_e164"),
	CONSTRAINT "users_google_subject_unique" UNIQUE("google_subject"),
	CONSTRAINT "users_apple_subject_unique" UNIQUE("apple_subject")
);
--> statement-breakpoint
CREATE TABLE "verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "document_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"provider_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"staff_role" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"status" "business_member_status" DEFAULT 'INVITED' NOT NULL,
	"invited_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"registration_number" text,
	"kra_pin_enc" text,
	"phone" text,
	"email" text,
	"authorized_representative_name" text,
	"authorized_representative_user_id" uuid,
	"verification_status" "verification_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_id" uuid,
	"decision_note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "host_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"status" "host_status" DEFAULT 'PENDING' NOT NULL,
	"brand_name" text,
	"bio" text,
	"avatar_object_key" text,
	"payout_provider" text,
	"payout_account_ref_enc" text,
	"payout_ready_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_id" uuid,
	"decision_note" text,
	"rating_average" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "location_kind" NOT NULL,
	"country" text DEFAULT 'KE' NOT NULL,
	"county" text,
	"city" text,
	"neighbourhood" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"suggested" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "availability_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"reason" "block_reason" DEFAULT 'MANUAL' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellation_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tier" "cancellation_tier" NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deposit_behavior" text DEFAULT 'RELEASE' NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_profile_id" uuid,
	"vehicle_location_id" uuid,
	"name" text NOT NULL,
	"radius_km" double precision,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"is_airport" boolean DEFAULT false NOT NULL,
	"area" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_catalog" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"category" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"kind" "pricing_rule_kind" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"daily_price_cents" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"charge_type" "extra_charge_type" NOT NULL,
	"unit_cents" integer NOT NULL,
	"max_quantity" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text,
	"insurer_name" text,
	"policy_number_enc" text,
	"cover_type" text,
	"restrictions_note" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"mandatory" boolean DEFAULT true NOT NULL,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"feature_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"thumbnail_key" text,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt_text" text,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"location_id" uuid,
	"location_name" text,
	"pickup_instruction" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"delivery_enabled" boolean DEFAULT false NOT NULL,
	"default_airport_fee_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_locations_vehicle_id_unique" UNIQUE("vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "vehicle_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"daily_price_cents" integer NOT NULL,
	"weekly_discount_bps" integer DEFAULT 0 NOT NULL,
	"monthly_discount_bps" integer DEFAULT 0 NOT NULL,
	"minimum_rental_hours" integer DEFAULT 24 NOT NULL,
	"minimum_rental_days" integer DEFAULT 1 NOT NULL,
	"deposit_rule" "deposit_rule" DEFAULT 'FIXED' NOT NULL,
	"deposit_amount_cents" integer DEFAULT 0 NOT NULL,
	"deposit_percent_bps" integer DEFAULT 0 NOT NULL,
	"deposit_daily_multiplier_bps" integer DEFAULT 0 NOT NULL,
	"mileage_policy_type" "mileage_policy_type" DEFAULT 'UNLIMITED' NOT NULL,
	"included_km_per_day" integer,
	"included_km_total" integer,
	"excess_per_km_cents" integer,
	"fuel_policy" "fuel_policy" DEFAULT 'SAME_TO_SAME' NOT NULL,
	"late_grace_minutes" integer DEFAULT 60 NOT NULL,
	"late_hourly_fee_cents" integer DEFAULT 0 NOT NULL,
	"cancellation_policy_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_pricing_vehicle_id_unique" UNIQUE("vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_profile_id" uuid NOT NULL,
	"business_id" uuid,
	"reference" text NOT NULL,
	"slug" text NOT NULL,
	"status" "vehicle_status" DEFAULT 'DRAFT' NOT NULL,
	"title" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"category" "vehicle_category" NOT NULL,
	"transmission" "transmission",
	"fuel_type" "fuel_type",
	"seats" integer,
	"doors" integer,
	"engine_capacity_cc" integer,
	"drivetrain" "drivetrain",
	"body_colour" text,
	"license_plate_enc" text,
	"instant_book_enabled" boolean DEFAULT false NOT NULL,
	"self_drive_enabled" boolean DEFAULT true NOT NULL,
	"chauffeur_enabled" boolean DEFAULT false NOT NULL,
	"ac" boolean DEFAULT false NOT NULL,
	"description" text,
	"rating_average" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_id" uuid,
	"rejection_reason" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_reference_unique" UNIQUE("reference"),
	CONSTRAINT "vehicles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "booking_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "adjustment_kind" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"status" "adjustment_status" DEFAULT 'PROPOSED' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"actor_type" "actor_type" DEFAULT 'SYSTEM' NOT NULL,
	"created_by_id" uuid,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"damage_report_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_extra_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"charge_type" "extra_charge_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"booking_id" uuid,
	"quote_id" uuid,
	"user_id" uuid NOT NULL,
	"status" "hold_status" DEFAULT 'ACTIVE' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_holds_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "booking_price_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"kind" "price_item_kind" NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "booking_price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"daily_rate_cents" integer NOT NULL,
	"billable_days" integer NOT NULL,
	"rental_subtotal_cents" integer NOT NULL,
	"extras_cents" integer NOT NULL,
	"delivery_cents" integer NOT NULL,
	"service_fee_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"deposit_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"refundable_cents" integer NOT NULL,
	"commission_bps" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_price_snapshots_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"actor_type" "actor_type" DEFAULT 'SYSTEM' NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"quote_id" uuid,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"host_profile_id" uuid NOT NULL,
	"business_id" uuid,
	"mode" "booking_mode" DEFAULT 'REQUEST' NOT NULL,
	"status" "booking_status" DEFAULT 'DRAFT' NOT NULL,
	"scheduled_pickup_at" timestamp with time zone NOT NULL,
	"scheduled_return_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Africa/Nairobi' NOT NULL,
	"pickup_option" "pickup_option" DEFAULT 'AT_LOCATION' NOT NULL,
	"delivery_zone_id" uuid,
	"delivery_snapshot" jsonb,
	"rental_subtotal_cents" integer DEFAULT 0 NOT NULL,
	"extras_cents" integer DEFAULT 0 NOT NULL,
	"delivery_cents" integer DEFAULT 0 NOT NULL,
	"service_fee_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"mileage_policy_type" "mileage_policy_type" DEFAULT 'UNLIMITED' NOT NULL,
	"included_km_total" integer,
	"excess_per_km_cents" integer,
	"fuel_policy" "fuel_policy" DEFAULT 'SAME_TO_SAME' NOT NULL,
	"cancellation_policy_code" text,
	"cancellation" jsonb,
	"confirmed_at" timestamp with time zone,
	"host_responded_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"extension_of_booking_id" uuid,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference"),
	CONSTRAINT "bookings_quote_id_unique" UNIQUE("quote_id")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"kind" "promo_kind" NOT NULL,
	"percent_bps" integer,
	"amount_cents" integer,
	"max_discount_cents" integer,
	"min_booking_cents" integer DEFAULT 0 NOT NULL,
	"scope" "promo_scope" DEFAULT 'GLOBAL' NOT NULL,
	"scope_id" uuid,
	"funded_by" text DEFAULT 'HOST' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_redemptions" integer,
	"per_user_once" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"kind" "price_item_kind" NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'ACTIVE' NOT NULL,
	"pickup_at" timestamp with time zone NOT NULL,
	"return_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Africa/Nairobi' NOT NULL,
	"pickup_option" "pickup_option" DEFAULT 'AT_LOCATION' NOT NULL,
	"delivery_zone_id" uuid,
	"promo_code_id" uuid,
	"rental_subtotal_cents" integer NOT NULL,
	"extras_cents" integer DEFAULT 0 NOT NULL,
	"delivery_cents" integer DEFAULT 0 NOT NULL,
	"service_fee_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"refundable_cents" integer DEFAULT 0 NOT NULL,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"extras_selection" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing_fingerprint" text NOT NULL,
	"idempotency_key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_reference_unique" UNIQUE("reference"),
	CONSTRAINT "quotes_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "deposit_status" DEFAULT 'REQUIRED' NOT NULL,
	"rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"payment_id" uuid,
	"released_cents" integer DEFAULT 0 NOT NULL,
	"deducted_cents" integer DEFAULT 0 NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_release_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deposits_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "ledger_account_type" NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posting_group" text NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" "ledger_direction" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"booking_id" uuid,
	"payment_id" uuid,
	"payout_id" uuid,
	"deposit_id" uuid,
	"refund_id" uuid,
	"external_ref" text,
	"memo" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"status" "webhook_event_status" DEFAULT 'RECEIVED' NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"raw_payload" text,
	"payload_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payment_ref" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"booking_id" uuid,
	"purpose" "payment_purpose" DEFAULT 'RENTAL' NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_ref" text,
	"provider_checkout_url" text,
	"provider_payload" jsonb,
	"failure_code" text,
	"failure_message" text,
	"requested_phone" text,
	"initiated_by_id" uuid,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payout_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"gross_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"adjustments_cents" integer DEFAULT 0 NOT NULL,
	"net_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"host_profile_id" uuid NOT NULL,
	"business_id" uuid,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"gross_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"adjustments_cents" integer DEFAULT 0 NOT NULL,
	"net_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"provider_ref" text,
	"failure_reason" text,
	"initiated_by_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"booking_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"deposit_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"provider_ref" text,
	"status" "refund_status" DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"failure_reason" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_reference_unique" UNIQUE("reference"),
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "damage_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reported_by_type" "actor_type" NOT NULL,
	"reported_by_id" uuid NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"estimated_amount_cents" integer,
	"currency" text DEFAULT 'KES' NOT NULL,
	"photo_keys" text[] DEFAULT '{}' NOT NULL,
	"status" "damage_status" DEFAULT 'REPORTED' NOT NULL,
	"decided_by_id" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"adjustment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL,
	"author_id" uuid,
	"author_type" "actor_type" NOT NULL,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"attachments" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"booking_id" uuid NOT NULL,
	"opened_by_id" uuid NOT NULL,
	"opened_by_type" "actor_type" NOT NULL,
	"subject" "dispute_subject" NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"resolution" text,
	"assigned_by_id" uuid,
	"decided_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"booking_id" uuid NOT NULL,
	"reported_by_id" uuid NOT NULL,
	"category" "incident_category" NOT NULL,
	"description" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"photo_keys" text[] DEFAULT '{}' NOT NULL,
	"police_ref" text,
	"contact_phone" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"acknowledged_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_reports_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "inspection_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_type" "inspection_type" NOT NULL,
	"inspection_id" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_type" "inspection_type" NOT NULL,
	"pickup_inspection_id" uuid,
	"return_inspection_id" uuid,
	"booking_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"angle" text,
	"label" text,
	"uploaded_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"submitted_by_id" uuid NOT NULL,
	"odometer_km" double precision,
	"fuel_level" integer,
	"exterior_notes" text,
	"interior_notes" text,
	"notes" text,
	"lat" double precision,
	"lng" double precision,
	"renter_signed_at" timestamp with time zone,
	"host_signed_at" timestamp with time zone,
	"renter_signed_by_id" uuid,
	"host_signed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_inspections_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "return_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"submitted_by_id" uuid NOT NULL,
	"odometer_km" double precision,
	"fuel_level" integer,
	"notes" text,
	"actual_returned_at" timestamp with time zone NOT NULL,
	"distance_km" double precision,
	"late_minutes" integer,
	"lat" double precision,
	"lng" double precision,
	"renter_signed_at" timestamp with time zone,
	"host_signed_at" timestamp with time zone,
	"renter_signed_by_id" uuid,
	"host_signed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_inspections_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distinct_id" text,
	"user_id" uuid,
	"event" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"prev_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"request_id" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"type" "conversation_type" NOT NULL,
	"booking_id" uuid,
	"vehicle_id" uuid,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "job_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid,
	"kind" "message_kind" DEFAULT 'TEXT' NOT NULL,
	"body" text,
	"attachment_key" text,
	"system_event_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'QUEUED' NOT NULL,
	"template" text,
	"title" text,
	"body" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_ref" text,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate" text NOT NULL,
	"aggregate_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"subject" "review_subject" NOT NULL,
	"subject_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comment" text,
	"visible" boolean DEFAULT true NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'APPROVED' NOT NULL,
	"host_reply" text,
	"host_reply_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" uuid,
	"booking_id" uuid,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "support_status" DEFAULT 'OPEN' NOT NULL,
	"email" text,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_verifications" ADD CONSTRAINT "driver_verifications_customer_profile_id_customer_profiles_id_fk" FOREIGN KEY ("customer_profile_id") REFERENCES "public"."customer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_host_profile_id_host_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."host_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_host_profile_id_host_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."host_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_vehicle_location_id_vehicle_locations_id_fk" FOREIGN KEY ("vehicle_location_id") REFERENCES "public"."vehicle_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_extras" ADD CONSTRAINT "rental_extras_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_features" ADD CONSTRAINT "vehicle_features_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_locations" ADD CONSTRAINT "vehicle_locations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_pricing" ADD CONSTRAINT "vehicle_pricing_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_host_profile_id_host_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."host_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_adjustments" ADD CONSTRAINT "booking_adjustments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_price_items" ADD CONSTRAINT "booking_price_items_snapshot_id_booking_price_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."booking_price_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_price_snapshots" ADD CONSTRAINT "booking_price_snapshots_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_host_profile_id_host_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."host_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_id_promo_codes_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_bookings" ADD CONSTRAINT "payout_bookings_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_bookings" ADD CONSTRAINT "payout_bookings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_host_profile_id_host_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."host_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_pickup_inspection_id_pickup_inspections_id_fk" FOREIGN KEY ("pickup_inspection_id") REFERENCES "public"."pickup_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_return_inspection_id_return_inspections_id_fk" FOREIGN KEY ("return_inspection_id") REFERENCES "public"."return_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_inspections" ADD CONSTRAINT "pickup_inspections_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_entity_idx" ON "addresses" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "consent_user_idx" ON "consent_records" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "driver_verification_status_idx" ON "driver_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "otp_lookup_idx" ON "otp_challenges" USING btree ("to","purpose","created_at");--> statement-breakpoint
CREATE INDEX "risk_resolution_idx" ON "risk_events" USING btree ("resolution","created_at");--> statement-breakpoint
CREATE INDEX "risk_user_idx" ON "risk_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignment_uq" ON "role_assignments" USING btree ("user_id","role","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "role_assignment_lookup_idx" ON "role_assignments" USING btree ("role","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verdoc_owner_idx" ON "verification_documents" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "verdoc_status_idx" ON "verification_documents" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "business_members_user_idx" ON "business_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_uq" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "businesses_verification_idx" ON "businesses" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "host_profiles_status_idx" ON "host_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "locations_county_idx" ON "locations" USING btree ("county","kind");--> statement-breakpoint
CREATE INDEX "availability_blocks_vehicle_idx" ON "availability_blocks" USING btree ("vehicle_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "delivery_zones_host_idx" ON "delivery_zones" USING btree ("host_profile_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_vehicle_idx" ON "pricing_rules" USING btree ("vehicle_id","starts_at");--> statement-breakpoint
CREATE INDEX "rental_extras_vehicle_idx" ON "rental_extras" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_documents_vehicle_idx" ON "vehicle_documents" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_documents_status_idx" ON "vehicle_documents" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_feature_uq" ON "vehicle_features" USING btree ("vehicle_id","feature_code");--> statement-breakpoint
CREATE INDEX "vehicle_images_vehicle_idx" ON "vehicle_images" USING btree ("vehicle_id","position");--> statement-breakpoint
CREATE INDEX "vehicle_locations_location_idx" ON "vehicle_locations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "vehicles_status_category_idx" ON "vehicles" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "vehicles_host_idx" ON "vehicles" USING btree ("host_profile_id");--> statement-breakpoint
CREATE INDEX "vehicles_make_idx" ON "vehicles" USING btree ("make");--> statement-breakpoint
CREATE INDEX "booking_adjustments_booking_idx" ON "booking_adjustments" USING btree ("booking_id","status");--> statement-breakpoint
CREATE INDEX "booking_extra_booking_idx" ON "booking_extra_selections" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_holds_vehicle_idx" ON "booking_holds" USING btree ("vehicle_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "booking_holds_status_idx" ON "booking_holds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "booking_price_items_snapshot_idx" ON "booking_price_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "booking_history_booking_idx" ON "booking_status_history" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "bookings_host_idx" ON "bookings" USING btree ("host_profile_id","status");--> statement-breakpoint
CREATE INDEX "bookings_vehicle_idx" ON "bookings" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE INDEX "bookings_status_pickup_idx" ON "bookings" USING btree ("status","scheduled_pickup_at");--> statement-breakpoint
CREATE INDEX "bookings_extension_idx" ON "bookings" USING btree ("extension_of_booking_id");--> statement-breakpoint
CREATE INDEX "promo_codes_active_idx" ON "promo_codes" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_redemption_uq" ON "promo_redemptions" USING btree ("promo_id","user_id","booking_id");--> statement-breakpoint
CREATE INDEX "quote_items_quote_idx" ON "quote_items" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quotes_user_idx" ON "quotes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "quotes_vehicle_idx" ON "quotes" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "deposits_status_idx" ON "deposits" USING btree ("status","scheduled_release_at");--> statement-breakpoint
CREATE INDEX "ledger_posting_group_idx" ON "ledger_entries" USING btree ("posting_group");--> statement-breakpoint
CREATE INDEX "ledger_account_idx" ON "ledger_entries" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_booking_idx" ON "ledger_entries" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_provider_event_uq" ON "payment_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_status_idx" ON "payment_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id","status");--> statement-breakpoint
CREATE INDEX "payments_provider_idx" ON "payments" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "payments_status_expiry_idx" ON "payments" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_booking_uq" ON "payout_bookings" USING btree ("payout_id","booking_id");--> statement-breakpoint
CREATE INDEX "payout_bookings_booking_idx" ON "payout_bookings" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payouts_host_idx" ON "payouts" USING btree ("host_profile_id","status");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "refunds_booking_idx" ON "refunds" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "damage_reports_booking_idx" ON "damage_reports" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "damage_reports_status_idx" ON "damage_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dispute_messages_dispute_idx" ON "dispute_messages" USING btree ("dispute_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disputes_booking_idx" ON "disputes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "incident_reports_booking_idx" ON "incident_reports" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "inspection_amendments_lookup_idx" ON "inspection_amendments" USING btree ("inspection_type","inspection_id");--> statement-breakpoint
CREATE INDEX "inspection_photos_booking_idx" ON "inspection_photos" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "analytics_event_idx" ON "analytics_events" USING btree ("event","created_at");--> statement-breakpoint
CREATE INDEX "analytics_user_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participant_uq" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "cp_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_booking_idx" ON "conversations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "conversations_vehicle_idx" ON "conversations" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "job_runs_name_idx" ON "job_runs" USING btree ("name","started_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "outbox_status_idx" ON "outbox_events" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "review_reports_status_idx" ON "review_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "review_uq" ON "reviews" USING btree ("booking_id","reviewer_id","subject");--> statement-breakpoint
CREATE INDEX "reviews_subject_idx" ON "reviews" USING btree ("subject","subject_id");--> statement-breakpoint
CREATE INDEX "support_status_idx" ON "support_requests" USING btree ("status");