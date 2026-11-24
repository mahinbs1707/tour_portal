import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { BookingStatusChips } from "../bookings/BookingStatusChips.jsx";
import { formatSubmittedAt } from "../bookings/bookingFormat.js";
import { formatCustomTourDateRange } from "./customTourFormat.js";
import { listAdminCustomTours } from "./adminCustomToursApi.js";

const selectClass =
  "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)] sm:w-auto";

const STATUS_OPTIONS = [
  ["PENDING", "filterPending"],
  ["APPROVED", "filterApproved"],
  ["REJECTED", "filterRejected"],
];

export function AdminCustomToursPage() {
  const location = useLocation();
  const [tours, setTours] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    () => location.state?.statusFilter ?? "",
  );
  const generationRef = useRef(0);
  const lastRequestedRef = useRef({ page: 1, status: "" });

  const loadPage = useCallback(async (targetPage, status) => {
    const generation = ++generationRef.current;
    lastRequestedRef.current = { page: targetPage, status };
    setLoading(true);
    setError("");
    try {
      const data = await listAdminCustomTours({ page: targetPage, status });
      if (generation !== generationRef.current) {
        return;
      }
      if (!data || !Array.isArray(data.results)) {
        setTours([]);
        setCount(0);
        setHasNext(false);
        setHasPrev(false);
        setError(messages.adminCustomTours.errors.listGeneric);
        return;
      }
      setTours(data.results);
      setCount(typeof data.count === "number" ? data.count : data.results.length);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
      setPage(targetPage);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      if (targetPage > 1 && err instanceof ApiError && err.status === 404) {
        loadPage(1, status);
        return;
      }
      setTours([]);
      setError(messages.adminCustomTours.errors.listGeneric);
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
  }, [statusFilter, loadPage]);

  return (
    <section data-testid="admin-custom-tours-page" aria-labelledby="admin-ct-heading">
      <h1 id="admin-ct-heading" className="text-display-sm m-0">
        {messages.adminCustomTours.listTitle}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.adminCustomTours.listSubtitle}
      </p>

      <label className="mt-6 block text-label" htmlFor="admin-ct-status-filter">
        {messages.adminCustomTours.filterStatusLabel}
        <select
          id="admin-ct-status-filter"
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{messages.adminCustomTours.filterAll}</option>
          {STATUS_OPTIONS.map(([value, key]) => (
            <option key={value} value={value}>
              {messages.adminCustomTours[key]}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p className="mt-8 text-[var(--color-muted-foreground)]" aria-busy="true">
          {messages.adminCustomTours.loading}
        </p>
      ) : null}

      {error ? (
        <p className="mt-8 text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && tours.length === 0 ? (
        <p className="mt-8 text-[var(--color-muted-foreground)]">
          {statusFilter
            ? messages.adminCustomTours.filterEmptyBody
            : messages.adminCustomTours.emptyBody}
        </p>
      ) : null}

      {!loading && !error && tours.length > 0 ? (
        <ul className="mt-8 m-0 flex list-none flex-col gap-3 p-0">
          {tours.map((tour) => (
            <li key={tour.id}>
              <Link
                to={`/app/admin/custom-tours/${tour.id}`}
                className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 no-underline"
              >
                <p className="text-headline m-0">{tour.title}</p>
                <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                  {tour.customer_full_name} · {tour.customer_email}
                </p>
                <p className="mt-1 m-0 text-body-sm">
                  {formatCustomTourDateRange(tour.start_date, tour.end_date)} ·{" "}
                  {formatSubmittedAt(tour.created_at)}
                </p>
                <div className="mt-3">
                  <BookingStatusChips
                    booking={{
                      status: tour.status,
                      payment_status: tour.payment_status,
                      payment_window_status: tour.payment_window_status,
                    }}
                    testIdPrefix={`admin-custom-tour-list-${tour.id}`}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && (hasPrev || hasNext) ? (
        <nav className="mt-6 flex gap-3" aria-label={messages.adminCustomTours.paginationLabel}>
          <button
            type="button"
            disabled={!hasPrev}
            className="min-h-11 rounded-[var(--radius-md)] border px-4 font-semibold disabled:opacity-40"
            onClick={() => loadPage(page - 1, statusFilter)}
          >
            {messages.adminCustomTours.prevPage}
          </button>
          <button
            type="button"
            disabled={!hasNext}
            className="min-h-11 rounded-[var(--radius-md)] border px-4 font-semibold disabled:opacity-40"
            onClick={() => loadPage(page + 1, statusFilter)}
          >
            {messages.adminCustomTours.nextPage}
          </button>
        </nav>
      ) : null}
    </section>
  );
}