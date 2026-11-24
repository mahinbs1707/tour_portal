import { apiRequest } from "../../services/apiClient.js";

/** Statuses that block another booking for the same package. */
export const ACTIVE_BOOKING_STATUSES = new Set(["PENDING", "APPROVED"]);

/**
 * Newest active (PENDING/APPROVED) booking for a package, if any.
 * @param {Array<{ package_id?: string, status?: string }>|null|undefined} bookings
 * @param {string} packageId
 */
export function findActiveBookingForPackage(bookings, packageId) {
  const pid = String(packageId || "");
  if (!pid || !Array.isArray(bookings)) {
    return null;
  }
  return (
    bookings.find(
      (row) =>
        row &&
        String(row.package_id) === pid &&
        ACTIVE_BOOKING_STATUSES.has(String(row.status || "").toUpperCase()),
    ) || null
  );
}

/**
 * POST /api/bookings/ — Customer create (Story 5.1 contract; Story 5.2 FE).
 * @param {{
 *   package_id: string,
 *   available_date_id: string,
 *   travelers: number,
 *   contact_name: string,
 *   contact_email: string,
 *   contact_phone: string,
 *   additional_requirements?: string,
 * }} payload
 */
export function createBooking(payload) {
  return apiRequest("/api/bookings/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/bookings/ — own booking history, newest first (Story 5.3). */
export function listMyBookings() {
  return apiRequest("/api/bookings/", { method: "GET" });
}

/** GET /api/bookings/<uuid>/ — own booking detail (404 for foreign ids). */
export function getBooking(bookingId) {
  return apiRequest(`/api/bookings/${encodeURIComponent(bookingId)}/`, {
    method: "GET",
  });
}

/** POST /api/bookings/<uuid>/cancel/ — cancel own PENDING booking. */
export function cancelBooking(bookingId) {
  return apiRequest(
    `/api/bookings/${encodeURIComponent(bookingId)}/cancel/`,
    { method: "POST" },
  );
}

/**
 * POST /api/bookings/<uuid>/payments/attempt/ — mock payment attempt (Story 7.1).
 * @param {"SUCCESS"|"FAILED"|"CANCELLED"} outcome
 */
export function submitPaymentAttempt(bookingId, outcome) {
  return apiRequest(
    `/api/bookings/${encodeURIComponent(bookingId)}/payments/attempt/`,
    {
      method: "POST",
      body: JSON.stringify({ outcome }),
    },
  );
}
