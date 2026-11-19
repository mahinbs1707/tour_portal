import { apiRequest } from "../../services/apiClient.js";

export function listAdminCustomTours({ page = 1, status = "" } = {}) {
  const params = new URLSearchParams();
  const n = Number(page);
  if (Number.isInteger(n) && n > 1) {
    params.set("page", String(n));
  }
  if (status) {
    params.set("status", status);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/custom-tours/admin/${query}`, { method: "GET" });
}

export function getAdminCustomTour(tourId) {
  return apiRequest(
    `/api/custom-tours/admin/${encodeURIComponent(tourId)}/`,
    { method: "GET" },
  );
}

export function approveAdminCustomTour(tourId) {
  return apiRequest(
    `/api/custom-tours/admin/${encodeURIComponent(tourId)}/approve/`,
    { method: "POST" },
  );
}

export function rejectAdminCustomTour(
  tourId,
  { rejection_reason, recommended_adjustments = "", reapply_enabled = false },
) {
  return apiRequest(
    `/api/custom-tours/admin/${encodeURIComponent(tourId)}/reject/`,
    {
      method: "POST",
      body: JSON.stringify({
        rejection_reason,
        recommended_adjustments,
        reapply_enabled,
      }),
    },
  );
}