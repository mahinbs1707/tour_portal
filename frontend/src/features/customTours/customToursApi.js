import { apiRequest } from "../../services/apiClient.js";

/**
 * POST /api/custom-tours/ — Customer create (Story 8.1).
 * @param {Record<string, unknown>} payload
 * @param {{ idempotencyKey?: string }} [options]
 */
/** GET /api/custom-tours/ — own custom tour history (Story 8.2). */
export function listMyCustomTours() {
  return apiRequest("/api/custom-tours/", { method: "GET" });
}

/** GET /api/custom-tours/<uuid>/ — own detail (404 for foreign ids). */
export function getCustomTour(tourId) {
  return apiRequest(`/api/custom-tours/${encodeURIComponent(tourId)}/`, {
    method: "GET",
  });
}

/** POST /api/custom-tours/<uuid>/reapply/ — resubmit after rejection (Story 8.4). */
export function reapplyCustomTour(tourId, payload) {
  return apiRequest(
    `/api/custom-tours/${encodeURIComponent(tourId)}/reapply/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function createCustomTour(payload, options = {}) {
  const headers = {};
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  return apiRequest("/api/custom-tours/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers,
  });
}