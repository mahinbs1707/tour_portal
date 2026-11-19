/** Notifies CustomerLayout to refresh the nav unread badge (Story 9.1). */

export const UNREAD_COUNT_INVALIDATE = "tour-portal:unread-count-invalidate";

export function dispatchUnreadCountInvalidate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(UNREAD_COUNT_INVALIDATE));
}