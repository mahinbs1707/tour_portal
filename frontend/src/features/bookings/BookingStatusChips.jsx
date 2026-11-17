import { messages } from "../../i18n/messages.js";

const chipClass =
  "inline-flex rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-body-sm font-semibold";

function statusText(map, value) {
  if (!value) {
    return messages.booking.statusNotAvailable;
  }
  return map[value] || value;
}

/**
 * Separate labeled Booking / Payment / Window chips (never merged).
 * Pay now is intentionally absent in Epic 5 (shown only when APPROVED + window
 * OPEN + payment not SUCCESS — Epic 7 owns that UI).
 */
export function BookingStatusChips({ booking, testIdPrefix = "booking" }) {
  const items = [
    {
      key: "booking",
      label: messages.booking.bookingStatusChip,
      value: booking.status,
      text: statusText(messages.booking.bookingStatus, booking.status),
    },
    {
      key: "payment",
      label: messages.booking.paymentStatusChip,
      value: booking.payment_status,
      text: statusText(messages.booking.paymentStatus, booking.payment_status),
    },
    {
      key: "window",
      label: messages.booking.windowStatusChip,
      value: booking.payment_window_status,
      text: statusText(
        messages.booking.windowStatus,
        booking.payment_window_status,
      ),
    },
  ];

  return (
    <ul
      className="m-0 flex list-none flex-wrap gap-3 p-0"
      data-testid={`${testIdPrefix}-status-chips`}
    >
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-muted-foreground)]">
            {item.label}
          </span>
          <span
            className={chipClass}
            data-testid={`${testIdPrefix}-${item.key}-status`}
            data-status={item.value || ""}
          >
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}