import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { getCustomerDashboard } from "../dashboard/dashboardApi.js";
import { UNREAD_COUNT_INVALIDATE } from "../notifications/unreadEvents.js";

function DashboardTile({ label, count, href, testId }) {
  return (
    <Link
      to={href}
      className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 no-underline hover:border-[var(--color-primary)]"
      data-testid={testId}
    >
      <p className="m-0 text-headline text-[var(--color-foreground)]">{count}</p>
      <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
        {label}
      </p>
    </Link>
  );
}

export function CustomerHomePage() {
  const [tiles, setTiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await getCustomerDashboard();
      if (generation !== generationRef.current) {
        return;
      }
      setTiles(data);
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setTiles(null);
      setError(messages.customerHome.errors.loadGeneric);
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

  useEffect(() => {
    const onInvalidate = () => {
      load();
    };
    window.addEventListener(UNREAD_COUNT_INVALIDATE, onInvalidate);
    return () => window.removeEventListener(UNREAD_COUNT_INVALIDATE, onInvalidate);
  }, [load]);

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="customer-home-heading"
      data-testid="customer-home-page"
    >
      <h1 id="customer-home-heading" className="text-display-sm m-0">
        {messages.customerHome.title}
      </h1>
      <p className="mt-3 text-[var(--color-muted-foreground)]">
        {messages.customerHome.subtitle}
      </p>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="customer-home-loading"
        >
          {messages.customerHome.loading}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && tiles ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <DashboardTile
            label={messages.customerHome.tiles.pendingBookings}
            count={tiles.pending_bookings ?? 0}
            href="/app/customer/bookings"
            testId="customer-home-tile-pending-bookings"
          />
          <DashboardTile
            label={messages.customerHome.tiles.openPaymentWindows}
            count={tiles.open_payment_windows ?? 0}
            href="/app/customer/bookings"
            testId="customer-home-tile-open-payments"
          />
          <DashboardTile
            label={messages.customerHome.tiles.unreadNotifications}
            count={tiles.unread_notifications ?? 0}
            href="/app/customer/notifications"
            testId="customer-home-tile-unread-notifications"
          />
        </div>
      ) : null}
    </section>
  );
}