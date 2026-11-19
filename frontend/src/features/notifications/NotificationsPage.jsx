import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { formatSubmittedAt } from "../bookings/bookingFormat.js";
import {
  listNotifications,
  markNotificationRead,
} from "./notificationsApi.js";
import { dispatchUnreadCountInvalidate } from "./unreadEvents.js";

/** Customer notification inbox (Story 9.1). */
export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications();
      if (generation !== generationRef.current) {
        return;
      }
      setItems(Array.isArray(data) ? data : []);
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setItems([]);
      setError(messages.notifications.errors.listGeneric);
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

  async function handleOpen(item) {
    if (!item?.id || openingId) {
      return;
    }
    setOpeningId(item.id);
    try {
      if (!item.is_read) {
        const updated = await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, is_read: true, ...updated } : row,
          ),
        );
        dispatchUnreadCountInvalidate();
      }
      if (item.deeplink) {
        navigate(item.deeplink);
      }
    } catch {
      setError(messages.notifications.errors.markReadGeneric);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <section
      className="mx-auto max-w-2xl px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="notifications-heading"
      data-testid="notifications-page"
    >
      <h1 id="notifications-heading" className="text-display-sm m-0">
        {messages.notifications.title}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.notifications.subtitle}
      </p>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="notifications-loading"
        >
          {messages.notifications.loading}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-[var(--color-muted-foreground)]"
          data-testid="notifications-empty"
        >
          {messages.notifications.emptyCaughtUp}
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul
          className="mt-8 list-none space-y-3 p-0"
          aria-label={messages.notifications.listLabel}
        >
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-left ${
                  item.is_read
                    ? "bg-[var(--color-card)]"
                    : "bg-[var(--color-card)] font-semibold ring-1 ring-[var(--color-primary)]"
                }`}
                data-testid={`notification-item-${item.id}`}
                onClick={() => handleOpen(item)}
                disabled={openingId === item.id}
              >
                <p className="m-0">{item.message}</p>
                <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                  {formatSubmittedAt(item.created_at)}
                  {item.is_read ? (
                    <span className="sr-only">
                      {messages.notifications.readLabel}
                    </span>
                  ) : (
                    <span className="ml-2 text-[var(--color-primary)]">
                      {messages.notifications.unreadLabel}
                    </span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}