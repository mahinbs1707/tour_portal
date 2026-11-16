import { apiRequest } from "../../services/apiClient.js";

/** GET /api/packages/admin/ — paginated Admin list. */
export function listAdminPackages(page = 1) {
  const query = page > 1 ? `?page=${page}` : "";
  return apiRequest(`/api/packages/admin/${query}`, { method: "GET" });
}

/** GET /api/packages/admin/:id/ */
export function getAdminPackage(id) {
  return apiRequest(`/api/packages/admin/${id}/`, { method: "GET" });
}

/** POST /api/packages/admin/ — create draft. */
export function createAdminPackage(payload) {
  return apiRequest("/api/packages/admin/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/packages/admin/:id/ */
export function updateAdminPackage(id, payload) {
  return apiRequest(`/api/packages/admin/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** POST /api/packages/admin/:id/publish/ */
export function publishAdminPackage(id) {
  return apiRequest(`/api/packages/admin/${id}/publish/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** POST /api/packages/admin/:id/unpublish/ */
export function unpublishAdminPackage(id) {
  return apiRequest(`/api/packages/admin/${id}/unpublish/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** GET /api/packages/admin/:packageId/dates/ */
export function listAdminPackageDates(packageId) {
  return apiRequest(`/api/packages/admin/${packageId}/dates/`, { method: "GET" });
}

/** POST /api/packages/admin/:packageId/dates/ */
export function createAdminPackageDate(packageId, { tour_date }) {
  return apiRequest(`/api/packages/admin/${packageId}/dates/`, {
    method: "POST",
    body: JSON.stringify({ tour_date }),
  });
}

/** PATCH /api/packages/admin/:packageId/dates/:dateId/ */
export function updateAdminPackageDate(packageId, dateId, { tour_date }) {
  return apiRequest(`/api/packages/admin/${packageId}/dates/${dateId}/`, {
    method: "PATCH",
    body: JSON.stringify({ tour_date }),
  });
}

/** DELETE /api/packages/admin/:packageId/dates/:dateId/ */
export function deleteAdminPackageDate(packageId, dateId) {
  return apiRequest(`/api/packages/admin/${packageId}/dates/${dateId}/`, {
    method: "DELETE",
  });
}

/** POST /api/packages/admin/:packageId/dates/:dateId/deactivate/ */
export function deactivateAdminPackageDate(packageId, dateId) {
  return apiRequest(
    `/api/packages/admin/${packageId}/dates/${dateId}/deactivate/`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

/**
 * First bookable calendar date = today + 7 days in business TZ (Asia/Dhaka).
 * Browser Date is local; Admin warning uses calendar-day comparison.
 */
export function minBookableDateIso(asOf = new Date()) {
  const d = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  d.setDate(d.getDate() + 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isWithinAdvanceWindow(isoDate, asOf = new Date()) {
  if (!isoDate) {
    return false;
  }
  return isoDate < minBookableDateIso(asOf);
}

/** Display helper: `{amount} {CODE}` (no hardcoded $). */
export function formatPackagePrice(amount, currency, locale = "en") {
  const code = (currency || "").trim().toUpperCase() || "—";
  const numeric = Number(amount);
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numeric)
    : String(amount ?? "");
  return `${formatted} ${code}`;
}
