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

/**
 * POST /api/bookings/admin/<uuid>/reject/ — reject a PENDING booking with a
 * mandatory reason (Story 6.3). Body `{ rejection_reason }`; resolves to the
 * Admin booking detail.
 */
export function rejectAdminBooking(bookingId, rejectionReason) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/reject/`,
    {
      method: "POST",
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    },
  );
}

/** POST /api/bookings/admin/<uuid>/reopen/ — reopen an EXPIRED window (Story 6.4). */
export function reopenAdminPaymentWindow(bookingId) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/reopen/`,
    { method: "POST" },
  );
}

/**
 * POST /api/bookings/admin/<uuid>/extend/ — set a future deadline (Story 6.4).
 * Body `{ deadline_at }` ISO string.
 */
export function extendAdminPaymentWindow(bookingId, deadlineAt) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/extend/`,
    {
      method: "POST",
      body: JSON.stringify({ deadline_at: deadlineAt }),
    },
  );
}

/** GET /api/bookings/admin/<uuid>/ — Admin booking detail. */
export function getAdminBooking(bookingId) {
  return apiRequest(
    `/api/bookings/admin/${encodeURIComponent(bookingId)}/`,
    { method: "GET" },
  );
}
