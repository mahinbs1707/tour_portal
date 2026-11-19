import { messages } from "../../i18n/messages.js";

/** Custom tour status chip (Story 8.2) — separate from booking/payment. */
export function CustomTourStatusChip({ status, testId = "custom-tour-status" }) {
  const label =
    messages.customTour.customTourStatus[status] ||
    messages.customTour.statusUnknown;
  return (
    <span
      className="inline-flex rounded-full bg-[var(--color-muted)] px-3 py-1 text-body-sm font-semibold"
      data-testid={testId}
    >
      {label}
    </span>
  );
}