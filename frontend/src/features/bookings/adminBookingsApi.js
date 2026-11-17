import { apiRequest } from "../../services/apiClient.js";

/**
 * GET /api/bookings/admin/ — paginated Admin list (Story 6.1).
 * Accepts `{ page, status }`; blank status means no filter (all bookings).
 */
export function listAdminBookings({ page = 1, status = "" } = {}) {
  const params = new URLSearchParams();
  const n = Number(page);
  if (Number.isInteger(n) && n > 1) {
    params.set("page", String(n));
  }
  if (status) {
    params.set("status", status);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/bookings/admin/${query}`, { method: "GET" });
}

/**
 * POST /api/bookings/admin/<uuid>/approve/ — approve a PENDING booking and open
 * its 24h payment window (Story 6.2). Resolves to the Admin booking detail.
 */
export function approveAdminBooking(bookingId) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/approve/`,
    { method: "POST" },
  );
}

/** GET /api/bookings/admin/<uuid>/ — Admin booking detail. */
export function getAdminBooking(bookingId) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/`,
    { method: "GET" },
  );
}
