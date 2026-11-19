import { apiRequest } from "../../services/apiClient.js";

/** GET /api/dashboard/customer/ — KPI tiles (Story 9.2). */
export function getCustomerDashboard() {
  return apiRequest("/api/dashboard/customer/", { method: "GET" });
}

/** GET /api/dashboard/admin/ — operational metrics (Story 9.3). */
export function getAdminDashboard() {
  return apiRequest("/api/dashboard/admin/", { method: "GET" });
}