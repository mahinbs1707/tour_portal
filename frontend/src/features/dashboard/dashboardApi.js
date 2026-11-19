import { apiRequest } from "../../services/apiClient.js";

/** GET /api/dashboard/customer/ — KPI tiles (Story 9.2). */
export function getCustomerDashboard() {
  return apiRequest("/api/dashboard/customer/", { method: "GET" });
}