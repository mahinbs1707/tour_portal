import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { PackageCard } from "./PackageCard.jsx";
import { listPublishedPackages } from "./packagesApi.js";

/**
 * Public Explore catalog — published packages only (Story 3.1).
 */
export function ExplorePage() {
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadGenerationRef = useRef(0);

  const loadPage = useCallback(async (targetPage) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await listPublishedPackages({ page: targetPage });
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
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPage(1);
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadPage]);

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
            onClick={() => loadPage(page)}
            data-testid="explore-retry"
          >
            {messages.explore.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && packages.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="explore-empty"
        >
          <h2 className="text-headline m-0">{messages.explore.emptyTitle}</h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.explore.emptyBody}
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
            data-testid="explore-empty-cta"
          >
            {messages.explore.emptyCta}
          </Link>
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
                onClick={() => loadPage(page - 1)}
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
                onClick={() => loadPage(page + 1)}
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
