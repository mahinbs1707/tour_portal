import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { getBooking } from "./bookingsApi.js";

const primaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]";
const secondaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline";

/**
 * Booking confirmation (Story 5.3): fetches the live booking by UUID so a
 * refresh shows current Booking / Payment / Window statuses. Pay stays hidden.
 * `reference` in the query is display fallback only, never a lookup key.
 */
export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const bookingId = (searchParams.get("booking") || "").trim();
  const referenceFallback = (searchParams.get("reference") || "").trim();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    if (!bookingId) {
      return;
    }
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await getBooking(bookingId);
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(data);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(null);
      const missing = err instanceof ApiError && err.status === 404;
      setNotFound(missing);
      setError(
        missing
          ? messages.booking.detailNotFoundBody
          : messages.booking.historyErrors.detailGeneric,
      );
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [bookingId]);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  const reference = booking?.reference || referenceFallback;

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

      {loading ? (
        <p
          className="mt-8 text-body-sm text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="booking-confirmation-loading"
        >
          {messages.booking.confirmationLoading}
        </p>
      ) : null}

      {!loading && error ? (
        <div className="mt-8" data-testid="booking-confirmation-error">
          <p
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
          {referenceFallback ? (
            <p className="mt-3 m-0 text-body-sm">
              {messages.booking.referenceLabel}:{" "}
              <span
                className="font-semibold tracking-wide"
                data-testid="booking-confirmation-reference"
              >
                {referenceFallback}
              </span>
            </p>
          ) : null}
          {!notFound ? (
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
              onClick={load}
              data-testid="booking-confirmation-retry"
            >
              {messages.booking.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && booking ? (
        <div
          className="mt-8 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5"
          data-testid="booking-confirmation-summary"
        >
          <div>
            <p className="m-0 text-label text-[var(--color-muted-foreground)]">
              {messages.booking.referenceLabel}
            </p>
            <p
              className="m-0 mt-1 font-semibold tracking-wide"
              data-testid="booking-confirmation-reference"
            >
              {booking.reference}
            </p>
          </div>
          <BookingStatusChips booking={booking} testIdPrefix="booking-confirmation" />
          {booking.status === "PENDING" &&
          booking.payment_window_status === "NOT_OPEN" ? (
            <p
              className="m-0 text-body-sm text-[var(--color-muted-foreground)]"
              data-testid="booking-confirmation-window-note"
            >
              {messages.booking.confirmationWindowNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && !booking && !error ? (
        <div
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-body-sm"
          role="status"
          data-testid="booking-confirmation-missing"
        >
          {reference ? (
            <p className="m-0 mb-2">
              {messages.booking.referenceLabel}:{" "}
              <span
                className="font-semibold tracking-wide"
                data-testid="booking-confirmation-reference"
              >
                {reference}
              </span>
            </p>
          ) : null}
          <p className="m-0">
            {reference
              ? messages.booking.confirmationReferenceOnly
              : messages.booking.confirmationMissing}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {booking ? (
          <Link
            to={`/app/customer/bookings/${booking.id}`}
            className={primaryLink}
            data-testid="booking-confirmation-detail"
          >
            {messages.booking.viewBookingDetail}
          </Link>
        ) : null}
        <Link
          to="/app/customer/bookings"
          className={booking ? secondaryLink : primaryLink}
          data-testid="booking-confirmation-history"
        >
          {messages.booking.viewMyBookings}
        </Link>
        <Link
          to="/explore"
          className={secondaryLink}
          data-testid="booking-confirmation-explore"
        >
          {messages.explore.backToExplore}
        </Link>
      </div>
    </section>
  );
}
