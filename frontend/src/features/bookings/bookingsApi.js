import { apiRequest } from "../../services/apiClient.js";

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
