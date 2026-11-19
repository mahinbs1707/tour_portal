import { apiRequest } from "../../services/apiClient.js";

/** GET /api/notifications/ */
export function listNotifications() {
  return apiRequest("/api/notifications/", { method: "GET" });
}

/** GET /api/notifications/unread-count/ */
export function getUnreadNotificationCount() {
  return apiRequest("/api/notifications/unread-count/", { method: "GET" });
}

/** POST /api/notifications/<uuid>/read/ */
export function markNotificationRead(notificationId) {
  return apiRequest(
    `/api/notifications/${encodeURIComponent(notificationId)}/read/`,
    { method: "POST", body: JSON.stringify({}) },
  );
}