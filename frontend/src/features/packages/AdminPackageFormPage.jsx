import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { AdminAvailableDatesPanel } from "./AdminAvailableDatesPanel.jsx";
import { AdminPackageMediaPanel } from "./AdminPackageMediaPanel.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import {
  createAdminPackage,
  getAdminPackage,
  publishAdminPackage,
  unpublishAdminPackage,
  updateAdminPackage,
} from "./packagesApi.js";

const EMPTY = {
  title: "",
  short_description: "",
  full_description: "",
  destinations: "",
  duration_days: "1",
  duration_nights: "0",
  starting_location: "",
  base_price: "",
  currency: "BDT",
  included_services: "",
  excluded_services: "",
  itinerary: "",
  difficulty: "",
  cancellation_policy: "",
  additional_info: "",
};

const REQUIRED_KEYS = new Set([
  "title",
  "short_description",
  "full_description",
  "destinations",
  "duration_days",
  "duration_nights",
  "starting_location",
  "base_price",
  "currency",
  "included_services",
  "excluded_services",
  "itinerary",
]);

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";
const textareaClass = `${inputClass} min-h-24 py-2`;

function toPayload(form) {
  const days = Number(form.duration_days);
  const nights = Number(form.duration_nights);
  if (!Number.isFinite(days) || days < 1) {
    const err = new Error("duration_days");
    err.fieldErrors = {
      duration_days: [messages.packages.errors.durationDays],
    };
    throw err;
  }
  if (!Number.isFinite(nights) || nights < 0) {
    const err = new Error("duration_nights");
    err.fieldErrors = {
      duration_nights: [messages.packages.errors.durationNights],
    };
    throw err;
  }
  return {
    title: form.title.trim(),
    short_description: form.short_description.trim(),
    full_description: form.full_description.trim(),
    destinations: form.destinations.trim(),
    duration_days: days,
    duration_nights: nights,
    starting_location: form.starting_location.trim(),
    base_price: form.base_price.trim(),
    currency: form.currency.trim(),
    included_services: form.included_services.trim(),
    excluded_services: form.excluded_services.trim(),
    itinerary: form.itinerary.trim(),
    difficulty: form.difficulty.trim(),
    cancellation_policy: form.cancellation_policy.trim(),
    additional_info: form.additional_info.trim(),
  };
}

function fromPackage(pkg) {
  return {
    title: pkg.title ?? "",
    short_description: pkg.short_description ?? "",
    full_description: pkg.full_description ?? "",
    destinations: pkg.destinations ?? "",
    duration_days: String(pkg.duration_days ?? "1"),
    duration_nights: String(pkg.duration_nights ?? "0"),
    starting_location: pkg.starting_location ?? "",
    base_price: String(pkg.base_price ?? ""),
    currency: pkg.currency ?? "BDT",
    included_services: pkg.included_services ?? "",
    excluded_services: pkg.excluded_services ?? "",
    itinerary: pkg.itinerary ?? "",
    difficulty: pkg.difficulty ?? "",
    cancellation_policy: pkg.cancellation_policy ?? "",
    additional_info: pkg.additional_info ?? "",
  };
}

export function AdminPackageFormPage() {
  const { packageId } = useParams();
  const isNew = !packageId || packageId === "new";
  const navigate = useNavigate();
  const formId = useId();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("DRAFT");
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isNew) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const pkg = await getAdminPackage(packageId);
        if (!cancelled) {
          setForm(fromPackage(pkg));
          setStatus(pkg.status || "DRAFT");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadFailed(true);
          setStatusError(
            err instanceof ApiError
              ? err.message
              : messages.packages.errors.generic,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, packageId]);

  const fields = useMemo(
    () => [
      { key: "title", label: messages.packages.fields.title, type: "text" },
      {
        key: "short_description",
        label: messages.packages.fields.shortDescription,
        type: "textarea",
      },
      {
        key: "full_description",
        label: messages.packages.fields.fullDescription,
        type: "textarea",
      },
      {
        key: "destinations",
        label: messages.packages.fields.destinations,
        type: "text",
      },
      {
        key: "duration_days",
        label: messages.packages.fields.durationDays,
        type: "number",
        min: "1",
      },
      {
        key: "duration_nights",
        label: messages.packages.fields.durationNights,
        type: "number",
        min: "0",
      },
      {
        key: "starting_location",
        label: messages.packages.fields.startingLocation,
        type: "text",
      },
      {
        key: "base_price",
        label: messages.packages.fields.basePrice,
        type: "text",
      },
      {
        key: "currency",
        label: messages.packages.fields.currency,
        type: "text",
      },
      {
        key: "included_services",
        label: messages.packages.fields.includedServices,
        type: "textarea",
      },
      {
        key: "excluded_services",
        label: messages.packages.fields.excludedServices,
        type: "textarea",
      },
      {
        key: "itinerary",
        label: messages.packages.fields.itinerary,
        type: "textarea",
      },
      {
        key: "difficulty",
        label: messages.packages.fields.difficulty,
        type: "text",
      },
      {
        key: "cancellation_policy",
        label: messages.packages.fields.cancellationPolicy,
        type: "textarea",
      },
      {
        key: "additional_info",
        label: messages.packages.fields.additionalInfo,
        type: "textarea",
      },
    ],
    [],
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveDraft() {
    if (savingRef.current || loadFailed) {
      return;
    }
    setStatusError("");
    setFieldErrors({});
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (isNew) {
        const created = await createAdminPackage(payload);
        if (!created?.id) {
          setStatusError(messages.packages.errors.generic);
          return;
        }
        navigate(`/app/admin/packages/${created.id}`, { replace: true });
      } else {
        const updated = await updateAdminPackage(packageId, payload);
        setForm(fromPackage(updated));
        setStatus(updated.status);
      }
    } catch (err) {
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors || {});
        setStatusError(err.nonFieldErrors?.[0] || err.message);
      } else {
        setStatusError(messages.packages.errors.generic);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function runPublish() {
    setConfirm(null);
    if (savingRef.current || isNew || loadFailed) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setStatusError("");
    try {
      const updated = await updateAdminPackage(packageId, toPayload(form));
      setForm(fromPackage(updated));
      setStatus(updated.status);
      const published = await publishAdminPackage(packageId);
      setForm(fromPackage(published));
      setStatus(published.status);
    } catch (err) {
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors || {});
        setStatusError(err.nonFieldErrors?.[0] || err.message);
      } else {
        setStatusError(messages.packages.errors.generic);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function runUnpublish() {
    setConfirm(null);
    if (savingRef.current || isNew || loadFailed) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setStatusError("");
    try {
      const unpublished = await unpublishAdminPackage(packageId);
      setForm(fromPackage(unpublished));
      setStatus(unpublished.status);
    } catch (err) {
      if (err instanceof ApiError) {
        setStatusError(err.nonFieldErrors?.[0] || err.message);
      } else {
        setStatusError(messages.packages.errors.generic);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-[var(--color-muted-foreground)]" aria-busy="true">
        {messages.packages.loading}
      </p>
    );
  }

  const actionsDisabled = saving || loadFailed;

  return (
    <section>
      <p className="m-0 mb-4">
        <Link
          to="/app/admin/packages"
          className="text-body-sm font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          {messages.packages.backToList}
        </Link>
      </p>
      <h1 className="text-display-sm m-0">
        {isNew ? messages.packages.createTitle : messages.packages.editTitle}
      </h1>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {status === "PUBLISHED"
          ? messages.packages.statusPublished
          : messages.packages.statusDraft}
      </p>

      {statusError ? (
        <p
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {statusError}
        </p>
      ) : null}

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          saveDraft();
        }}
      >
        {fields.map((field) => {
          const id = `${formId}-${field.key}`;
          const err = fieldErrors[field.key]?.[0];
          const required = REQUIRED_KEYS.has(field.key);
          const shared = {
            id,
            name: field.key,
            className: `${field.type === "textarea" ? textareaClass : inputClass} ${
              err
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`,
            value: form[field.key],
            onChange: (event) => setField(field.key, event.target.value),
            "aria-invalid": Boolean(err),
            "aria-required": required || undefined,
            required: required || undefined,
            disabled: loadFailed,
            "aria-describedby": err ? `${id}-error` : undefined,
          };
          return (
            <div key={field.key}>
              <label className={labelClass} htmlFor={id}>
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea {...shared} />
              ) : (
                <input
                  {...shared}
                  type={field.type}
                  min={
                    field.type === "number"
                      ? field.min ?? "0"
                      : undefined
                  }
                />
              )}
              {err ? (
                <p id={`${id}-error`} className={errorClass}>
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={actionsDisabled}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? messages.packages.saving : messages.packages.saveDraft}
          </button>
          {!isNew && status !== "PUBLISHED" ? (
            <button
              type="button"
              disabled={actionsDisabled}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
              onClick={() => setConfirm("publish")}
            >
              {messages.packages.publish}
            </button>
          ) : null}
          {!isNew && status === "PUBLISHED" ? (
            <button
              type="button"
              disabled={actionsDisabled}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
              onClick={() => setConfirm("unpublish")}
            >
              {messages.packages.unpublish}
            </button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={confirm === "publish"}
        title={messages.packages.confirmPublishTitle}
        body={messages.packages.confirmPublishBody}
        confirmLabel={messages.packages.publish}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={runPublish}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        title={messages.packages.confirmUnpublishTitle}
        body={messages.packages.confirmUnpublishBody}
        confirmLabel={messages.packages.unpublish}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={runUnpublish}
      />

      {!isNew && !loadFailed ? (
        <>
          <AdminPackageMediaPanel packageId={packageId} />
          <AdminAvailableDatesPanel packageId={packageId} />
        </>
      ) : null}
    </section>
  );
}
