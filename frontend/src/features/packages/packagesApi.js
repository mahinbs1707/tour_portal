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
