import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { getAdminDashboard } from "../dashboard/dashboardApi.js";

function MetricTile({ label, count, href, linkState, highlight, testId }) {
  const className = highlight
    ? "block rounded-[var(--radius-md)] border-2 border-[var(--color-primary)] bg-[var(--color-card)] p-4 no-underline ring-2 ring-[var(--color-primary)]/20"
    : "block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 no-underline hover:border-[var(--color-primary)]";

  return (
    <Link
      to={href}
      state={linkState}
      className={className}
      data-testid={testId}
    >
      <p className="m-0 text-headline text-[var(--color-foreground)]">{count}</p>
      <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
        {label}
      </p>
      {highlight ? (
        <p className="mt-2 m-0 text-body-sm font-semibold text-[var(--color-primary)]">
          {messages.adminHome.needsReviewHint}
        </p>
      ) : null}
    </Link>
  );
}

export function AdminHomePage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await getAdminDashboard();
      if (generation !== generationRef.current) {
        return;
      }
      setMetrics(data);
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setMetrics(null);
      setError(messages.adminHome.errors.loadGeneric);
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

  const m = metrics || {};

  return (
    <section aria-labelledby="admin-home-heading" data-testid="admin-home-page">
      <h1 id="admin-home-heading" className="text-display-sm m-0">
        {messages.adminHome.title}
      </h1>
      <p className="mt-3 text-[var(--color-muted-foreground)]">
        {messages.adminHome.subtitle}
      </p>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="admin-home-loading"
        >
          {messages.adminHome.loading}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && metrics ? (
        <>
          <h2 className="text-headline mt-8 mb-4">{messages.adminHome.packagesSection}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile
              label={messages.adminHome.metrics.totalPackages}
              count={m.total_packages ?? 0}
              href="/app/admin/packages"
              testId="admin-metric-total-packages"
            />
            <MetricTile
              label={messages.adminHome.metrics.publishedPackages}
              count={m.published_packages ?? 0}
              href="/app/admin/packages"
              testId="admin-metric-published-packages"
            />
            <MetricTile
              label={messages.adminHome.metrics.draftPackages}
              count={m.draft_packages ?? 0}
              href="/app/admin/packages"
              testId="admin-metric-draft-packages"
            />
          </div>

          <h2 className="text-headline mt-10 mb-4">{messages.adminHome.bookingsSection}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile
              label={messages.adminHome.metrics.pendingBookings}
              count={m.pending_bookings ?? 0}
              href="/app/admin/bookings"
              linkState={{ statusFilter: "PENDING" }}
              highlight={(m.pending_bookings ?? 0) > 0}
              testId="admin-metric-pending-bookings"
            />
            <MetricTile
              label={messages.adminHome.metrics.approvedBookings}
              count={m.approved_bookings ?? 0}
              href="/app/admin/bookings"
              linkState={{ statusFilter: "APPROVED" }}
              testId="admin-metric-approved-bookings"
            />
            <MetricTile
              label={messages.adminHome.metrics.rejectedBookings}
              count={m.rejected_bookings ?? 0}
              href="/app/admin/bookings"
              linkState={{ statusFilter: "REJECTED" }}
              testId="admin-metric-rejected-bookings"
            />
          </div>

          <h2 className="text-headline mt-10 mb-4">{messages.adminHome.customToursSection}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile
              label={messages.adminHome.metrics.pendingCustomTours}
              count={m.pending_custom_tours ?? 0}
              href="/app/admin/custom-tours"
              linkState={{ statusFilter: "PENDING" }}
              highlight={(m.pending_custom_tours ?? 0) > 0}
              testId="admin-metric-pending-custom-tours"
            />
            <MetricTile
              label={messages.adminHome.metrics.approvedCustomTours}
              count={m.approved_custom_tours ?? 0}
              href="/app/admin/custom-tours"
              linkState={{ statusFilter: "APPROVED" }}
              testId="admin-metric-approved-custom-tours"
            />
            <MetricTile
              label={messages.adminHome.metrics.rejectedCustomTours}
              count={m.rejected_custom_tours ?? 0}
              href="/app/admin/custom-tours"
              linkState={{ statusFilter: "REJECTED" }}
              testId="admin-metric-rejected-custom-tours"
            />
          </div>

          <nav className="mt-10" aria-label={messages.adminHome.managementNavLabel}>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 sm:flex-row sm:flex-wrap">
              <li>
                <Link
                  to="/app/admin/packages"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  {messages.nav.packages}
                </Link>
              </li>
              <li>
                <Link
                  to="/app/admin/bookings"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  {messages.nav.bookings}
                </Link>
              </li>
              <li>
                <Link
                  to="/app/admin/custom-tours"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  {messages.nav.customToursAdmin}
                </Link>
              </li>
            </ul>
          </nav>
        </>
      ) : null}
    </section>
  );
}