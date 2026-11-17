import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { formatSubmittedAt } from "./bookingFormat.js";
import { listMyBookings } from "./bookingsApi.js";

/** Customer booking history — own bookings only; Pay hidden (Story 5.3). */
export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await listMyBookings();
      if (generation !== generationRef.current) {
        return;
      }
      if (!Array.isArray(data)) {
        setBookings([]);
        setError(messages.booking.historyErrors.listGeneric);
        return;
      }
      setBookings(data);
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setBookings([]);
      setError(messages.booking.historyErrors.listGeneric);
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  return (
    <section data-testid="my-bookings-page" aria-labelledby="my-bookings-heading">
      <h1 id="my-bookings-heading" className="text-display-sm m-0">
        {messages.booking.historyTitle}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.booking.historySubtitle}
      </p>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="my-bookings-loading"
        >
          {messages.booking.historyLoading}
        </p>
      ) : null}

      {error ? (
        <div className="mt-8" data-testid="my-bookings-error">
          <p
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={load}
            data-testid="my-bookings-retry"
          >
            {messages.booking.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && bookings.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="my-bookings-empty"
        >
          <h2 className="text-headline m-0">{messages.booking.historyEmptyTitle}</h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.booking.historyEmptyBody}
          </p>
          <Link
            to="/explore"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
          >
            {messages.booking.historyEmptyCta}
          </Link>
        </div>
      ) : null}

      {!loading && !error && bookings.length > 0 ? (
        <ul
          className="mt-8 m-0 flex list-none flex-col gap-3 p-0"
          aria-label={messages.booking.historyListLabel}
          data-testid="my-bookings-list"
        >
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/app/customer/bookings/${booking.id}`}
                className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] no-underline hover:border-[var(--color-primary)]"
                data-testid={`my-booking-card-${booking.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-headline m-0">{booking.package_title}</p>
                  <span
                    className="text-body-sm font-semibold tracking-wide"
                    data-testid={`my-booking-reference-${booking.id}`}
                  >
                    {booking.reference}
                  </span>
                </div>
                <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                  {messages.booking.travelDateLabel}: {booking.tour_date}
                  {" · "}
                  {messages.booking.travelersSummaryLabel}: {booking.travelers}
                  {" · "}
                  {messages.booking.submittedAtLabel}:{" "}
                  {formatSubmittedAt(booking.created_at)}
                </p>
                <div className="mt-3">
                  <BookingStatusChips
                    booking={booking}
                    testIdPrefix={`my-booking-${booking.id}`}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
