import { RoleName } from './enums';

export const Permission = {
  PROFILE_READ_SELF: 'profile.read.self',
  PROFILE_UPDATE_SELF: 'profile.update.self',
  DRIVER_VERIFICATION_SUBMIT: 'verification.driver.submit',
  HOST_ONBOARD_SUBMIT: 'host.onboarding.submit',
  HOST_READ_SELF: 'host.read.self',
  HOST_UPDATE_SELF: 'host.update.self',
  STAFF_MANAGE: 'staff.manage',
  VEHICLE_CREATE: 'vehicle.create',
  VEHICLE_READ_OWN: 'vehicle.read.own',
  VEHICLE_UPDATE_OWN: 'vehicle.update.own',
  VEHICLE_SUBMIT: 'vehicle.submit',
  AVAILABILITY_MANAGE_OWN: 'availability.manage.own',
  PRICING_MANAGE_OWN: 'pricing.manage.own',
  BOOKING_CREATE: 'booking.create',
  BOOKING_READ_SELF: 'booking.read.self',
  BOOKING_CANCEL_SELF: 'booking.cancel.self',
  BOOKING_HOST_READ: 'booking.host.read',
  BOOKING_HOST_RESPOND: 'booking.host.respond',
  BOOKING_HOST_CANCEL: 'booking.host.cancel',
  INSPECTION_SUBMIT: 'inspection.submit',
  MESSAGING_USE: 'messaging.use',
  REVIEW_CREATE: 'review.create.self',
  SUPPORT_CREATE: 'support.create',
  ADMIN_USERS_READ: 'admin.users.read',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_HOSTS_READ: 'admin.hosts.read',
  ADMIN_HOSTS_VERIFY: 'admin.hosts.verify',
  ADMIN_HOSTS_SUSPEND: 'admin.hosts.suspend',
  ADMIN_VEHICLES_READ: 'admin.vehicles.read',
  ADMIN_VEHICLES_APPROVE: 'admin.vehicles.approve',
  ADMIN_VEHICLES_SUSPEND: 'admin.vehicles.suspend',
  ADMIN_DOCUMENTS_READ: 'admin.documents.read',
  ADMIN_DOCUMENTS_VERIFY: 'admin.documents.verify',
  ADMIN_DRIVER_READ: 'admin.driver.read',
  ADMIN_DRIVER_VERIFY: 'admin.driver.verify',
  ADMIN_BOOKINGS_READ: 'admin.bookings.read',
  ADMIN_BOOKINGS_MANAGE: 'admin.bookings.manage',
  ADMIN_PAYMENTS_READ: 'admin.payments.read',
  ADMIN_REFUNDS_CREATE: 'admin.refunds.create',
  ADMIN_DEPOSITS_MANAGE: 'admin.deposits.manage',
  ADMIN_LEDGER_READ: 'admin.ledger.read',
  ADMIN_PAYOUTS_READ: 'admin.payouts.read',
  ADMIN_PAYOUTS_APPROVE: 'admin.payouts.approve',
  ADMIN_DISPUTES_HANDLE: 'admin.disputes.handle',
  ADMIN_REVIEWS_MODERATE: 'admin.reviews.moderate',
  ADMIN_PROMOTIONS_MANAGE: 'admin.promotions.manage',
  ADMIN_CONTENT_MANAGE: 'admin.content.manage',
  ADMIN_NOTIFICATIONS_SEND: 'admin.notifications.send',
  ADMIN_AUDIT_READ: 'admin.audit.read',
  ADMIN_RISK_REVIEW: 'admin.risk.review',
  ADMIN_INCIDENTS_HANDLE: 'admin.incidents.handle',
  ANALYTICS_VIEW: 'analytics.view',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const P = Permission;

// Base grants per role. Scoped resources are additionally ownership-checked.
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.CUSTOMER]: [
    P.PROFILE_READ_SELF, P.PROFILE_UPDATE_SELF, P.DRIVER_VERIFICATION_SUBMIT,
    P.HOST_ONBOARD_SUBMIT, P.HOST_READ_SELF,
    P.BOOKING_CREATE, P.BOOKING_READ_SELF, P.BOOKING_CANCEL_SELF,
    P.INSPECTION_SUBMIT, P.MESSAGING_USE, P.REVIEW_CREATE, P.SUPPORT_CREATE,
  ],
  [RoleName.HOST]: [
    P.PROFILE_READ_SELF, P.PROFILE_UPDATE_SELF,
    P.HOST_ONBOARD_SUBMIT, P.HOST_READ_SELF, P.HOST_UPDATE_SELF, P.STAFF_MANAGE,
    P.VEHICLE_CREATE, P.VEHICLE_READ_OWN, P.VEHICLE_UPDATE_OWN, P.VEHICLE_SUBMIT,
    P.AVAILABILITY_MANAGE_OWN, P.PRICING_MANAGE_OWN,
    P.BOOKING_HOST_READ, P.BOOKING_HOST_RESPOND, P.BOOKING_HOST_CANCEL,
    P.INSPECTION_SUBMIT, P.MESSAGING_USE, P.REVIEW_CREATE, P.SUPPORT_CREATE,
  ],
  [RoleName.HOST_STAFF]: [
    P.VEHICLE_READ_OWN, P.VEHICLE_UPDATE_OWN, P.AVAILABILITY_MANAGE_OWN,
    P.BOOKING_HOST_READ, P.BOOKING_HOST_RESPOND, P.INSPECTION_SUBMIT,
    P.MESSAGING_USE,
  ],
  [RoleName.SUPER_ADMIN]: Object.values(P),
  [RoleName.OPERATIONS]: [
    P.ADMIN_HOSTS_READ, P.ADMIN_VEHICLES_READ, P.ADMIN_BOOKINGS_READ,
    P.ADMIN_BOOKINGS_MANAGE, P.ADMIN_DISPUTES_HANDLE, P.ADMIN_INCIDENTS_HANDLE,
    P.ADMIN_DRIVER_READ, P.ADMIN_DOCUMENTS_READ, P.ANALYTICS_VIEW,
    P.ADMIN_NOTIFICATIONS_SEND, P.ADMIN_RISK_REVIEW, P.ADMIN_USERS_READ,
  ],
  [RoleName.CUSTOMER_SUPPORT]: [
    P.ADMIN_USERS_READ, P.ADMIN_HOSTS_READ, P.ADMIN_VEHICLES_READ,
    P.ADMIN_BOOKINGS_READ, P.ADMIN_PAYMENTS_READ, P.ADMIN_DRIVER_READ,
    P.ADMIN_DISPUTES_HANDLE, P.ADMIN_NOTIFICATIONS_SEND,
  ],
  [RoleName.VERIFICATION]: [
    P.ADMIN_HOSTS_READ, P.ADMIN_HOSTS_VERIFY, P.ADMIN_DRIVER_READ,
    P.ADMIN_DRIVER_VERIFY, P.ADMIN_DOCUMENTS_READ, P.ADMIN_DOCUMENTS_VERIFY,
    P.ADMIN_VEHICLES_READ, P.ADMIN_VEHICLES_APPROVE, P.ADMIN_RISK_REVIEW,
  ],
  [RoleName.FINANCE]: [
    P.ADMIN_PAYMENTS_READ, P.ADMIN_REFUNDS_CREATE, P.ADMIN_DEPOSITS_MANAGE,
    P.ADMIN_LEDGER_READ, P.ADMIN_PAYOUTS_READ, P.ADMIN_PAYOUTS_APPROVE,
    P.ADMIN_BOOKINGS_READ, P.ANALYTICS_VIEW, P.ADMIN_PROMOTIONS_MANAGE,
    P.ADMIN_AUDIT_READ,
  ],
  [RoleName.CONTENT_MODERATION]: [
    P.ADMIN_REVIEWS_MODERATE, P.ADMIN_CONTENT_MANAGE, P.ADMIN_VEHICLES_READ,
  ],
};

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Permissions that require MFA re-verification in the current session. */
export const MFA_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  P.ADMIN_USERS_MANAGE, P.ADMIN_HOSTS_VERIFY, P.ADMIN_HOSTS_SUSPEND,
  P.ADMIN_VEHICLES_APPROVE, P.ADMIN_VEHICLES_SUSPEND, P.ADMIN_DOCUMENTS_VERIFY,
  P.ADMIN_DRIVER_VERIFY, P.ADMIN_BOOKINGS_MANAGE, P.ADMIN_REFUNDS_CREATE,
  P.ADMIN_DEPOSITS_MANAGE, P.ADMIN_PAYOUTS_APPROVE, P.ADMIN_LEDGER_READ,
  P.ADMIN_AUDIT_READ, P.ADMIN_RISK_REVIEW,
]);
