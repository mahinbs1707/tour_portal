import { messages } from "../../i18n/messages.js";

/** Blocks pay/checkout actions while offline (UX-DR11, Story 7.3). */
export function OfflinePayBanner({ testId = "offline-pay-banner" }) {
  return (
    <p
      className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-body-sm font-semibold"
      role="alert"
      data-testid={testId}
    >
      {messages.booking.offlinePayBanner}
    </p>
  );
}