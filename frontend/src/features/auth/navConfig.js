import { messages } from "../../i18n/messages.js";

/** Guest primary nav — FR-LP-08 / Story 1.6. */
export const guestNavItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/sign-in", label: messages.nav.signIn },
  { to: "/sign-up", label: messages.nav.signUp },
];

/** Customer primary nav — public + customer chrome. */
export const customerNavItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/app/customer/bookings", label: messages.nav.myBookings },
  { to: "/app/customer/custom-tours", label: messages.nav.customTours },
  { to: "/app/customer/notifications", label: messages.nav.notifications },
  { to: "/sign-out", label: messages.nav.signOut },
];

/**
 * Admin on public TopNav — no Admin ops links (those stay in `/app/admin/*` sidebar).
 * Home returns to `/app/admin` (complement of sidebar “View site”).
 */
export const adminPublicNavItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/app/admin", label: messages.nav.home },
  { to: "/sign-out", label: messages.nav.signOut },
];

/** Authenticated but missing/unknown role — Sign out only (never Guest Sign in/up). */
export const unknownRoleNavItems = [
  { to: "/sign-out", label: messages.nav.signOut },
];

/** Neutral chrome while session bootstrap runs — avoid Guest Sign in/up flash. */
export const bootstrappingNavItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
];

/**
 * Resolve TopNav items from AuthProvider role after bootstrap.
 * Keys on `role` only (CUSTOMER | ADMIN) — never is_staff.
 */
export function resolveTopNavItems({ bootstrapping, isAuthenticated, role }) {
  if (bootstrapping) {
    return bootstrappingNavItems;
  }
  if (!isAuthenticated) {
    return guestNavItems;
  }
  if (role === "CUSTOMER") {
    return customerNavItems;
  }
  if (role === "ADMIN") {
    return adminPublicNavItems;
  }
  return unknownRoleNavItems;
}
