import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { listAdminBookings } from "./adminBookingsApi.js";
import { formatSubmittedAt } from "./bookingFormat.js";

const selectClass =
  "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)] sm:w-auto";

const STATUS_OPTIONS = [
  ["PENDING", "filterPending"],
  ["APPROVED", "filterApproved"],
  ["REJECTED", "filterRejected"],
  ["CANCELLED", "filterCancelled"],
];

/**
 * Admin bookings list — all customers, filter by booking status, paginated
 * (Story 6.1). Read-only: no approve / reject / window controls yet.
 */
export function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Default filter is "All" (1A): no status param on initial load.
  const [statusFilter, setStatusFilter] = useState("");
  const generationRef = useRef(0);
  // Last requested {page,status}: Retry repeats this, not the last *successful* page.
  const lastRequestedRef = useRef({ page: 1, status: "" });

  const loadPage = useCallback(async (targetPage, status) => {
    const generation = ++generationRef.current;
    lastRequestedRef.current = { page: targetPage, status };
    setLoading(true);
    setError("");
    try {
      const data = await listAdminBookings({ page: targetPage, status });
      if (generation !== generationRef.current) {
        return;
      }
      if (!data || !Array.isArray(data.results)) {
        setBookings([]);
        setCount(0);
        setHasNext(false);
        setHasPrev(false);
        setError(messages.adminBookings.errors.listGeneric);
        return;
      }
      setBookings(data.results);
      setCount(typeof data.count === "number" ? data.count : data.results.length);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
      setPage(targetPage);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      if (targetPage > 1 && err instanceof ApiError && err.status === 404) {
        // DRF invalid-page 404 (page vanished, e.g. after rows changed): restart at page 1.
        loadPage(1, status);
        return;
      }
      setBookings([]);
      setError(messages.adminBookings.errors.listGeneric);
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPage(1, statusFilter);
    return () => {
      generationRef.current += 1;
    };
  }, [loadPage, statusFilter]);

  const filtersActive = Boolean(statusFilter);

  return (
    <section data-testid="admin-bookings-page" aria-labelledby="admin-bookings-heading">
      <h1 id="admin-bookings-heading" className="text-display-sm m-0">
        {messages.adminBookings.listTitle}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.adminBookings.listSubtitle}
      </p>

      <div
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        data-testid="admin-bookings-filters"
      >
        <div>
          <label
            className="text-label text-[var(--color-foreground)]"
            htmlFor="admin-bookings-status-filter"
          >
            {messages.adminBookings.filterStatusLabel}
          </label>
          <select
            id="admin-bookings-status-filter"
            className={selectClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            data-testid="admin-bookings-status-filter"
          >
            <option value="">{messages.adminBookings.filterAll}</option>
            {STATUS_OPTIONS.map(([value, key]) => (
              <option key={value} value={value}>
                {messages.adminBookings[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="admin-bookings-loading"
        >
          {messages.adminBookings.loading}
        </p>
      ) : null}

      {error ? (
        <div className="mt-8" data-testid="admin-bookings-error">
          <p
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={() =>
              loadPage(
                lastRequestedRef.current.page,
                lastRequestedRef.current.status,
              )
            }
            data-testid="admin-bookings-retry"
          >
            {messages.booking.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && bookings.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="admin-bookings-empty"
        >
          <h2 className="text-headline m-0">
            {filtersActive
              ? messages.adminBookings.filterEmptyTitle
              : messages.adminBookings.emptyTitle}
          </h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {filtersActive
              ? messages.adminBookings.filterEmptyBody
              : messages.adminBookings.emptyBody}
          </p>
          {filtersActive ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
              onClick={() => setStatusFilter("")}
              data-testid="admin-bookings-clear-filters"
            >
              {messages.adminBookings.clearFilters}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && bookings.length > 0 ? (
        <>
          <ul
            className="mt-8 m-0 flex list-none flex-col gap-3 p-0"
            aria-label={messages.adminBookings.listLabel}
            data-testid="admin-bookings-list"
          >
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  to={`/app/admin/bookings/${booking.id}`}
                  className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] no-underline hover:border-[var(--color-primary)]"
                  data-testid={`admin-booking-card-${booking.id}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-headline m-0">{booking.package_title}</p>
                    <span
                      className="text-body-sm font-semibold tracking-wide"
                      data-testid={`admin-booking-reference-${booking.id}`}
                    >
                      {booking.reference}
                    </span>
                  </div>
                  <p
                    className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]"
                    data-testid={`admin-booking-customer-${booking.id}`}
                  >
                    {messages.adminBookings.customerLabel}:{" "}
                    {booking.customer_full_name
                      ? `${booking.customer_full_name} (${booking.customer_email})`
                      : booking.customer_email}
                  </p>
                  <p className="mt-1 m-0 text-body-sm text-[var(--color-muted-foreground)]">
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
                      testIdPrefix={`admin-booking-${booking.id}`}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {(hasNext || hasPrev) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 disabled:opacity-50"
                disabled={!hasPrev || loading}
                onClick={() => loadPage(page - 1, statusFilter)}
                data-testid="admin-bookings-prev"
              >
                {messages.adminBookings.prevPage}
              </button>
              <span className="text-body-sm text-[var(--color-muted-foreground)]">
                {messages.adminBookings.pageStatus
                  .replace("{page}", String(page))
                  .replace("{count}", String(count))}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 disabled:opacity-50"
                disabled={!hasNext || loading}
                onClick={() => loadPage(page + 1, statusFilter)}
                data-testid="admin-bookings-next"
              >
                {messages.adminBookings.nextPage}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
