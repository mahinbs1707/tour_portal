import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { formatPackagePrice, listAdminPackages } from "./packagesApi.js";

const selectClass =
  "mt-1 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)] sm:w-auto";

export function AdminPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const loadGenerationRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage, nextStatus = statusFilter, nextFeatured = featuredFilter) => {
      const generation = ++loadGenerationRef.current;
      setLoading(true);
      setError("");
      try {
        const opts = { page: targetPage };
        if (nextStatus) {
          opts.status = nextStatus;
        }
        if (nextFeatured === "true" || nextFeatured === "false") {
          opts.featured = nextFeatured;
        }
        const data = await listAdminPackages(opts);
        if (generation !== loadGenerationRef.current) {
          return;
        }
        if (!data || !Array.isArray(data.results)) {
          setPackages([]);
          setCount(0);
          setHasNext(false);
          setHasPrev(false);
          setError(messages.packages.errors.generic);
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
          err instanceof ApiError
            ? err.message
            : messages.packages.errors.generic,
        );
        setPackages([]);
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [statusFilter, featuredFilter],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) {
        return;
      }
      await loadPage(1, statusFilter, featuredFilter);
    })();
    return () => {
      cancelled = true;
      loadGenerationRef.current += 1;
    };
  }, [loadPage, statusFilter, featuredFilter]);

  function clearFilters() {
    setStatusFilter("");
    setFeaturedFilter("");
  }

  const filtersActive = Boolean(statusFilter || featuredFilter);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-display-sm m-0">{messages.packages.listTitle}</h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {messages.packages.listSubtitle}
          </p>
        </div>
        <Link
          to="/app/admin/packages/new"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
        >
          {messages.packages.createCta}
        </Link>
      </div>

      <div
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        data-testid="admin-packages-filters"
      >
        <div>
          <label className="text-label text-[var(--color-foreground)]" htmlFor="admin-packages-status-filter">
            {messages.packages.filterStatusLabel}
          </label>
          <select
            id="admin-packages-status-filter"
            className={selectClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            data-testid="admin-packages-status-filter"
          >
            <option value="">{messages.packages.filterAll}</option>
            <option value="DRAFT">{messages.packages.filterDraft}</option>
            <option value="PUBLISHED">{messages.packages.filterPublished}</option>
          </select>
        </div>
        <div>
          <label className="text-label text-[var(--color-foreground)]" htmlFor="admin-packages-featured-filter">
            {messages.packages.filterFeaturedLabel}
          </label>
          <select
            id="admin-packages-featured-filter"
            className={selectClass}
            value={featuredFilter}
            onChange={(event) => setFeaturedFilter(event.target.value)}
            data-testid="admin-packages-featured-filter"
          >
            <option value="">{messages.packages.filterAll}</option>
            <option value="true">{messages.packages.filterFeaturedYes}</option>
            <option value="false">{messages.packages.filterFeaturedNo}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-[var(--color-muted-foreground)]" aria-busy="true">
          {messages.packages.loading}
        </p>
      ) : null}

      {error ? (
        <p
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {!loading && !error && packages.length === 0 ? (
        <div
          className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="admin-packages-empty"
        >
          <h2 className="text-headline m-0">
            {filtersActive
              ? messages.packages.filterEmptyTitle
              : messages.packages.emptyTitle}
          </h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {filtersActive
              ? messages.packages.filterEmptyBody
              : messages.packages.emptyBody}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {filtersActive ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
                onClick={clearFilters}
                data-testid="admin-packages-clear-filters"
              >
                {messages.packages.clearFilters}
              </button>
            ) : null}
            <Link
              to="/app/admin/packages/new"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]"
            >
              {messages.packages.createCta}
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && packages.length > 0 ? (
        <>
          <ul
            className="mt-8 m-0 flex list-none flex-col gap-3 p-0"
            data-testid="admin-packages-card-list"
          >
            {packages.map((pkg) => (
              <li key={pkg.id}>
                <Link
                  to={`/app/admin/packages/${pkg.id}`}
                  className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] no-underline hover:border-[var(--color-primary)]"
                  data-testid={`admin-package-card-${pkg.id}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-headline m-0">{pkg.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm text-[var(--color-muted-foreground)]">
                        {pkg.status === "PUBLISHED"
                          ? messages.packages.statusPublished
                          : messages.packages.statusDraft}
                      </span>
                      {pkg.is_featured ? (
                        <span
                          className="text-body-sm font-semibold text-[var(--color-primary)]"
                          data-testid={`admin-package-featured-chip-${pkg.id}`}
                        >
                          {messages.packages.featuredChip}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                    {pkg.destinations}
                    {" · "}
                    {formatPackagePrice(pkg.base_price, pkg.currency)}
                  </p>
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
                onClick={() => loadPage(page - 1)}
              >
                {messages.packages.prevPage}
              </button>
              <span className="text-body-sm text-[var(--color-muted-foreground)]">
                {messages.packages.pageStatus
                  .replace("{page}", String(page))
                  .replace("{count}", String(count))}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 disabled:opacity-50"
                disabled={!hasNext || loading}
                onClick={() => loadPage(page + 1)}
              >
                {messages.packages.nextPage}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
