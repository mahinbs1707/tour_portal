import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { formatSubmittedAt } from "../bookings/bookingFormat.js";
import { CustomTourStatusChip } from "./CustomTourStatusChip.jsx";
import { formatCustomTourDateRange } from "./customTourFormat.js";
import { listMyCustomTours } from "./customToursApi.js";

/** Customer custom tour history — own records only (Story 8.2). */
export function MyCustomToursPage() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await listMyCustomTours();
      if (generation !== generationRef.current) {
        return;
      }
      setTours(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) {
        setError(messages.customTour.historyErrors.listGeneric);
      }
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setTours([]);
      setError(messages.customTour.historyErrors.listGeneric);
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
    <section
      data-testid="my-custom-tours-page"
      aria-labelledby="my-custom-tours-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="my-custom-tours-heading" className="text-display-sm m-0">
            {messages.customTour.historyTitle}
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {messages.customTour.historySubtitle}
          </p>
        </div>
        <Link
          to="/app/customer/custom-tours/new"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]"
          data-testid="my-custom-tours-create"
        >
          {messages.customTour.createNew}
        </Link>
      </div>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="my-custom-tours-loading"
        >
          {messages.customTour.historyLoading}
        </p>
      ) : null}

      {error ? (
        <div className="mt-8" data-testid="my-custom-tours-error">
          <p className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={load}
            data-testid="my-custom-tours-retry"
          >
            {messages.booking.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && tours.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="my-custom-tours-empty"
        >
          <h2 className="text-headline m-0">{messages.customTour.historyEmptyTitle}</h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.customTour.historyEmptyBody}
          </p>
          <Link
            to="/app/customer/custom-tours/new"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
          >
            {messages.customTour.historyEmptyCta}
          </Link>
        </div>
      ) : null}

      {!loading && !error && tours.length > 0 ? (
        <ul
          className="mt-8 m-0 flex list-none flex-col gap-3 p-0"
          aria-label={messages.customTour.historyListLabel}
          data-testid="my-custom-tours-list"
        >
          {tours.map((tour) => (
            <li key={tour.id}>
              <Link
                to={`/app/customer/custom-tours/${tour.id}`}
                className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] no-underline hover:border-[var(--color-primary)]"
                data-testid={`my-custom-tour-card-${tour.id}`}
              >
                <p className="text-headline m-0">{tour.title}</p>
                <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                  {messages.customTour.destinationLabel}: {tour.destination}
                  {" · "}
                  {messages.customTour.datesLabel}:{" "}
                  {formatCustomTourDateRange(tour.start_date, tour.end_date)}
                  {" · "}
                  {messages.customTour.submittedAtLabel}:{" "}
                  {formatSubmittedAt(tour.created_at)}
                </p>
                <div className="mt-3">
                  <CustomTourStatusChip
                    status={tour.status}
                    testId={`my-custom-tour-status-${tour.id}`}
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