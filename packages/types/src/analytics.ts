// Funnel + KPI event vocabulary (spec §58). Server is the authoritative tracker.
export const CustomerEvent = {
  HOMEPAGE_VIEWED: 'homepage_viewed',
  SEARCH_SUBMITTED: 'search_submitted',
  SEARCH_RESULTS_VIEWED: 'search_results_viewed',
  ZERO_RESULT_SEARCH: 'zero_result_search',
  VEHICLE_VIEWED: 'vehicle_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  BOOKING_CONFIRMED: 'booking_confirmed',
  PICKUP_COMPLETED: 'pickup_completed',
  RETURN_COMPLETED: 'return_completed',
  REVIEW_SUBMITTED: 'review_submitted',
} as const;

export const HostEvent = {
  HOST_SIGNUP: 'host_signup',
  HOST_VERIFICATION_SUBMITTED: 'host_verification_submitted',
  HOST_VERIFICATION_APPROVED: 'host_verification_approved',
  VEHICLE_ADDED: 'vehicle_added',
  VEHICLE_SUBMITTED: 'vehicle_submitted',
  VEHICLE_APPROVED: 'vehicle_approved',
  FIRST_BOOKING: 'first_booking',
  BOOKING_ACCEPTED: 'booking_accepted',
  FIRST_COMPLETED_RENTAL: 'first_completed_rental',
  FIRST_PAYOUT: 'first_payout',
} as const;

export const KPI = {
  SEARCH_TO_VIEW: 'search_to_view',
  VIEW_TO_CHECKOUT: 'view_to_checkout',
  CHECKOUT_TO_PAYMENT: 'checkout_to_payment',
  PAYMENT_TO_RENTAL: 'payment_to_rental',
  ZERO_RESULT_RATE: 'zero_result_rate',
  CANCELLATION_RATE: 'cancellation_rate',
  HOST_ACCEPTANCE_RATE: 'host_acceptance_rate',
  HOST_RESPONSE_TIME: 'host_response_time',
  VEHICLE_UTILIZATION: 'vehicle_utilization',
  GMV: 'gmv',
  MARKETPLACE_REVENUE: 'marketplace_revenue',
  AVERAGE_BOOKING_VALUE: 'average_booking_value',
  REPEAT_BOOKING_RATE: 'repeat_booking_rate',
  REFUND_RATE: 'refund_rate',
  DISPUTE_RATE: 'dispute_rate',
  PAYMENT_FAILURE_RATE: 'payment_failure_rate',
  TIME_TO_FIRST_BOOKING: 'time_to_first_booking',
} as const;
export type CustomerEvent = (typeof CustomerEvent)[keyof typeof CustomerEvent];
export type HostEvent = (typeof HostEvent)[keyof typeof HostEvent];
