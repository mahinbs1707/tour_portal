import { useCallback, useEffect, useState } from "react";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import {
  createAdminPackageDate,
  deactivateAdminPackageDate,
  deleteAdminPackageDate,
  isWithinAdvanceWindow,
  listAdminPackageDates,
  minBookableDateIso,
} from "./packagesApi.js";

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";

/**
 * Admin available-date management for an existing package (Story 2.2).
 */
export function AdminAvailableDatesPanel({ packageId }) {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listAdminPackageDates(packageId);
      setDates(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : messages.packages.errors.generic,
      );
      setDates([]);
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    load();
  }, [load]);

  const showAdvanceWarning = isWithinAdvanceWindow(tourDate);

  async function handleAdd(event) {
    event.preventDefault();
    if (!tourDate || saving) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createAdminPackageDate(packageId, { tour_date: tourDate });
      setTourDate("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.nonFieldErrors?.[0] ||
              Object.values(err.fieldErrors || {}).flat()[0] ||
              err.message
          : messages.packages.errors.generic,
      );
    } finally {
      setSaving(false);
    }
  }

  async function runDelete() {
    const row = confirmDelete;
    setConfirmDelete(null);
    if (!row) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await deleteAdminPackageDate(packageId, row.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.nonFieldErrors?.[0] ||
              err.fieldErrors?.detail?.[0] ||
              err.message
          : messages.packages.errors.generic,
      );
    } finally {
      setSaving(false);
    }
  }

  async function runDeactivate() {
    const row = confirmDeactivate;
    setConfirmDeactivate(null);
    if (!row) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await deactivateAdminPackageDate(packageId, row.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.nonFieldErrors?.[0] || err.message
          : messages.packages.errors.generic,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 border-t border-[var(--color-border)] pt-8">
      <h2 className="text-headline m-0">{messages.packages.datesTitle}</h2>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.packages.datesSubtitle}
      </p>

      {error ? (
        <p
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleAdd}>
        <div className="min-w-[12rem] flex-1">
          <label className="text-label" htmlFor="admin-tour-date">
            {messages.packages.fields.tourDate}
          </label>
          <input
            id="admin-tour-date"
            type="date"
            className={inputClass}
            value={tourDate}
            onChange={(event) => setTourDate(event.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving || !tourDate}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
        >
          {messages.packages.addDate}
        </button>
      </form>

      {showAdvanceWarning ? (
        <p
          className="mt-3 text-body-sm text-[var(--color-muted-foreground)]"
          role="status"
        >
          {messages.packages.advanceWarning.replace(
            "{minDate}",
            minBookableDateIso(),
          )}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-[var(--color-muted-foreground)]" aria-busy="true">
          {messages.packages.datesLoading}
        </p>
      ) : null}

      {!loading && dates.length === 0 ? (
        <p className="mt-4 text-body-sm text-[var(--color-muted-foreground)]">
          {messages.packages.datesEmpty}
        </p>
      ) : null}

      {!loading && dates.length > 0 ? (
        <ul className="mt-4 m-0 flex list-none flex-col gap-2 p-0">
          {dates.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            >
              <div>
                <span className="font-semibold">{row.tour_date}</span>
                <span className="ml-2 text-body-sm text-[var(--color-muted-foreground)]">
                  {row.is_active
                    ? messages.packages.dateActive
                    : messages.packages.dateInactive}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.is_active ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-body-sm"
                    disabled={saving}
                    onClick={() => setConfirmDeactivate(row)}
                  >
                    {messages.packages.deactivateDate}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-body-sm"
                  disabled={saving}
                  onClick={() => setConfirmDelete(row)}
                >
                  {messages.packages.removeDate}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={messages.packages.confirmRemoveDateTitle}
        body={messages.packages.confirmRemoveDateBody}
        confirmLabel={messages.packages.removeDate}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={runDelete}
      />
      <ConfirmDialog
        open={Boolean(confirmDeactivate)}
        title={messages.packages.confirmDeactivateDateTitle}
        body={messages.packages.confirmDeactivateDateBody}
        confirmLabel={messages.packages.deactivateDate}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirmDeactivate(null)}
        onConfirm={runDeactivate}
      />
    </section>
  );
}
