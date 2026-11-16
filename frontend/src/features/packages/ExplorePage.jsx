import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { PackageCard } from "./PackageCard.jsx";
import { listPublishedPackages } from "./packagesApi.js";

const EMPTY_FILTERS = {
  q: "",
  destination: "",
  min_price: "",
  max_price: "",
  duration_days: "",
};

const inputClass =
  "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";

function filtersAreActive(filters) {
  return Boolean(
    filters.q.trim() ||
      filters.destination.trim() ||
      filters.min_price.trim() ||
      filters.max_price.trim() ||
      filters.duration_days.trim(),
  );
}

/**
 * Public Explore catalog — published packages + server-side search/filters (3.1 / 3.4).
 */
export function ExplorePage() {
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const loadGenerationRef = useRef(0);

  const loadPage = useCallback(async (targetPage, filters = appliedFilters) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError("");
    try {
      const opts = { page: targetPage };
      if (filters.q.trim()) {
        opts.q = filters.q.trim();
      }
      if (filters.destination.trim()) {
        opts.destination = filters.destination.trim();
      }
      if (filters.min_price.trim()) {
        opts.min_price = filters.min_price.trim();
      }
      if (filters.max_price.trim()) {
        opts.max_price = filters.max_price.trim();
      }
      if (filters.duration_days.trim()) {
        opts.duration_days = filters.duration_days.trim();
      }
      const data = await listPublishedPackages(opts);
      if (generation !== loadGenerationRef.current) {
        return;
      }
      if (!data || !Array.isArray(data.results)) {
        setPackages([]);
        setCount(0);
        setHasNext(false);
        setHasPrev(false);
        setError(messages.explore.errors.generic);
        return;
      }
      setPackages(data.results);
      setCount(typeof data.count === "number" ? data.count : data.results.length);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
      setPage(targetPage);
    } catch (err) {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setError(
        err instanceof ApiError ? err.message : messages.explore.errors.generic,
      );
      setPackages([]);
      setCount(0);
      setHasNext(false);
      setHasPrev(false);
      setPage(1);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadPage(1, appliedFilters);
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadPage, appliedFilters]);

  function updateDraft(field, value) {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleApply(event) {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
  }

  function handleClear() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  const searchActive = filtersAreActive(appliedFilters);

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="explore-heading"
    >
      <h1 id="explore-heading" className="text-display-sm m-0">
        {messages.explore.title}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.explore.subtitle}
      </p>

      <form
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={handleApply}
        data-testid="explore-search-form"
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-label" htmlFor="explore-search-q">
            {messages.explore.searchLabel}
          </label>
          <input
            id="explore-search-q"
            type="search"
            className={inputClass}
            value={draftFilters.q}
            onChange={(event) => updateDraft("q", event.target.value)}
            placeholder={messages.explore.searchPlaceholder}
            data-testid="explore-search-q"
          />
        </div>
        <div>
          <label className="text-label" htmlFor="explore-filter-destination">
            {messages.explore.destinationLabel}
          </label>
          <input
            id="explore-filter-destination"
            type="text"
            className={inputClass}
            value={draftFilters.destination}
            onChange={(event) => updateDraft("destination", event.target.value)}
            placeholder={messages.explore.destinationPlaceholder}
            data-testid="explore-filter-destination"
          />
        </div>
        <div>
          <label className="text-label" htmlFor="explore-filter-min-price">
            {messages.explore.minPriceLabel}
          </label>
          <input
            id="explore-filter-min-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={inputClass}
            value={draftFilters.min_price}
            onChange={(event) => updateDraft("min_price", event.target.value)}
            data-testid="explore-filter-min-price"
          />
        </div>
        <div>
          <label className="text-label" htmlFor="explore-filter-max-price">
            {messages.explore.maxPriceLabel}
          </label>
          <input
            id="explore-filter-max-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={inputClass}
            value={draftFilters.max_price}
            onChange={(event) => updateDraft("max_price", event.target.value)}
            data-testid="explore-filter-max-price"
          />
        </div>
        <div>
          <label className="text-label" htmlFor="explore-filter-duration">
            {messages.explore.durationLabel}
          </label>
          <input
            id="explore-filter-duration"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className={inputClass}
            value={draftFilters.duration_days}
            onChange={(event) =>
              updateDraft("duration_days", event.target.value)
            }
            data-testid="explore-filter-duration"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]"
            data-testid="explore-apply-filters"
          >
            {messages.explore.applyFilters}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={handleClear}
            data-testid="explore-clear-filters"
          >
            {messages.explore.clearFilters}
          </button>
        </div>
      </form>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="explore-loading"
        >
          {messages.explore.loading}
        </p>
      ) : null}

      {error ? (
        <div className="mt-8" data-testid="explore-error">
          <p
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {error}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={() => loadPage(1, appliedFilters)}
            data-testid="explore-retry"
          >
            {messages.explore.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && packages.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid={searchActive ? "explore-no-match" : "explore-empty"}
        >
          <h2 className="text-headline m-0">
            {searchActive
              ? messages.explore.noMatchTitle
              : messages.explore.emptyTitle}
          </h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {searchActive
              ? messages.explore.noMatchBody
              : messages.explore.emptyBody}
          </p>
          {searchActive ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
              onClick={handleClear}
              data-testid="explore-no-match-clear"
            >
              {messages.explore.clearFilters}
            </button>
          ) : (
            <Link
              to="/"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
              data-testid="explore-empty-cta"
            >
              {messages.explore.emptyCta}
            </Link>
          )}
        </div>
      ) : null}

      {!loading && packages.length > 0 ? (
        <>
          <ul
            className="mt-8 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="explore-card-list"
          >
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </ul>
          {(hasNext || hasPrev) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 disabled:opacity-50"
                disabled={!hasPrev || loading}
                onClick={() => loadPage(page - 1, appliedFilters)}
                data-testid="explore-prev-page"
              >
                {messages.explore.prevPage}
              </button>
              <span className="text-body-sm text-[var(--color-muted-foreground)]">
                {messages.explore.pageStatus
                  .replace("{page}", String(page))
                  .replace("{count}", String(count))}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 disabled:opacity-50"
                disabled={!hasNext || loading}
                onClick={() => loadPage(page + 1, appliedFilters)}
                data-testid="explore-next-page"
              >
                {messages.explore.nextPage}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
