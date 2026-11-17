import { Link, useSearchParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";

/**
 * Thin booking confirmation — reference + PENDING (Story 5.2).
 * History/detail/cancel polish is Story 5.3.
 */
export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const reference = (searchParams.get("reference") || "").trim();
  // Thin 5.2 confirmation always shows PENDING — do not trust status query.
  const status = "PENDING";

  return (
    <section
      className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="booking-confirmation-heading"
      data-testid="booking-confirmation-page"
    >
      <h1
        id="booking-confirmation-heading"
        className="text-display-sm m-0 text-[var(--color-foreground)]"
      >
        {messages.booking.confirmationTitle}
      </h1>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.booking.confirmationSubtitle}
      </p>

      {reference ? (
        <dl
          className="mt-8 m-0 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5"
          data-testid="booking-confirmation-summary"
        >
          <div>
            <dt className="text-label text-[var(--color-muted-foreground)]">
              {messages.booking.referenceLabel}
            </dt>
            <dd
              className="m-0 mt-1 font-semibold tracking-wide"
              data-testid="booking-confirmation-reference"
            >
              {reference}
            </dd>
          </div>
          <div>
            <dt className="text-label text-[var(--color-muted-foreground)]">
              {messages.booking.statusLabel}
            </dt>
            <dd className="m-0 mt-1" data-testid="booking-confirmation-status">
              <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-body-sm font-semibold">
                {status}
              </span>
            </dd>
          </div>
        </dl>
      ) : (
        <p
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-body-sm"
          role="status"
          data-testid="booking-confirmation-missing"
        >
          {messages.booking.confirmationMissing}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/app/customer/bookings"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]"
          data-testid="booking-confirmation-history"
        >
          {messages.booking.viewMyBookings}
        </Link>
        <Link
          to="/explore"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
          data-testid="booking-confirmation-explore"
        >
          {messages.explore.backToExplore}
        </Link>
      </div>
    </section>
  );
}
