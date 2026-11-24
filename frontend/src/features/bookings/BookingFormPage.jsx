import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  formatTourDate,
  mapUnavailableReason,
} from "../packages/PackageDetailPage.jsx";
import {
  getPublishedPackage,
  isWithinAdvanceWindow,
  minBookableDateIso,
} from "../packages/packagesApi.js";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "./bookingDraft.js";
import {
  createBooking,
  findActiveBookingForPackage,
  listMyBookings,
} from "./bookingsApi.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 255;
const PHONE_MAX = 64;
const REQUIREMENTS_MAX = 2000;

/** Form-bound keys that can show inline field errors from FE or BE. */
export const BOOKING_FORM_ERROR_KEYS = new Set([
  "available_date_id",
  "travelers",
  "contact_name",
  "contact_email",
  "contact_phone",
  "additional_requirements",
]);

function calendarDayIso(asOf = new Date()) {
  const yyyy = asOf.getFullYear();
  const mm = String(asOf.getMonth() + 1).padStart(2, "0");
  const dd = String(asOf.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";
const textareaClass = `${inputClass} min-h-24 py-2`;

function emptyForm() {
  return {
    available_date_id: "",
    travelers: "1",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    additional_requirements: "",
  };
}

/** Active package dates that pass the FE 7-day (Asia/Dhaka calendar) rule. */
export function bookableDateOptions(availableDates, asOf = new Date()) {
  const rows = Array.isArray(availableDates) ? availableDates : [];
  return rows.filter((row) => {
    if (!row || !row.id || !row.tour_date) {
      return false;
    }
    return !isWithinAdvanceWindow(row.tour_date, asOf);
  });
}

export function validateBookingForm(form, { bookableIds }) {
  const errors = {};
  if (!form.available_date_id) {
    errors.available_date_id = messages.booking.errors.dateRequired;
  } else if (!bookableIds.has(form.available_date_id)) {
    errors.available_date_id = messages.booking.errors.dateUnavailable;
  }

  const travelersRaw = String(form.travelers ?? "").trim();
  const travelers = Number(travelersRaw);
  if (!travelersRaw) {
    errors.travelers = messages.booking.errors.travelersRequired;
  } else if (!Number.isInteger(travelers) || travelers < 1) {
    errors.travelers = messages.booking.errors.travelersInvalid;
  }

  const name = String(form.contact_name || "").trim();
  if (!name) {
    errors.contact_name = messages.booking.errors.nameRequired;
  } else if (name.length > NAME_MAX) {
    errors.contact_name = messages.booking.errors.nameTooLong.replace(
      "{max}",
      String(NAME_MAX),
    );
  }

  const email = String(form.contact_email || "").trim();
  if (!email) {
    errors.contact_email = messages.booking.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.contact_email = messages.booking.errors.emailInvalid;
  }

  const phone = String(form.contact_phone || "").trim();
  if (!phone) {
    errors.contact_phone = messages.booking.errors.phoneRequired;
  } else if (phone.length > PHONE_MAX) {
    errors.contact_phone = messages.booking.errors.phoneTooLong.replace(
      "{max}",
      String(PHONE_MAX),
    );
  }

  const requirements = String(form.additional_requirements || "");
  if (requirements.length > REQUIREMENTS_MAX) {
    errors.additional_requirements = messages.booking.errors.requirementsTooLong
      .replace("{max}", String(REQUIREMENTS_MAX));
  }

  return errors;
}

function FieldError({ id, message }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className={errorClass} role="alert">
      {message}
    </p>
  );
}

/**
 * Customer booking form + review → POST /api/bookings/ (Story 5.2).
 */
export function BookingFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageId = (searchParams.get("package") || "").trim();
  const { user } = useAuth();
  const formId = useId();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(Boolean(packageId));
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [step, setStep] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const loadGenerationRef = useRef(0);
  const draftHydratedRef = useRef(false);
  const submittingRef = useRef(false);
  const [calendarDay, setCalendarDay] = useState(() => calendarDayIso());

  useEffect(() => {
    const syncCalendarDay = () => {
      const next = calendarDayIso();
      setCalendarDay((prev) => (prev === next ? prev : next));
    };
    const intervalId = window.setInterval(syncCalendarDay, 60_000);
    window.addEventListener("focus", syncCalendarDay);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncCalendarDay);
    };
  }, []);

  // calendarDay keeps options fresh across midnight without a remount.
  const bookableDates = useMemo(
    () => bookableDateOptions(pkg?.available_dates),
    [pkg, calendarDay],
  );
  const bookableIds = useMemo(
    () => new Set(bookableDates.map((row) => String(row.id))),
    [bookableDates],
  );
  const selectedDate = bookableDates.find(
    (row) => String(row.id) === String(form.available_date_id),
  );
  const minBookable = minBookableDateIso();
  const isBookablePackage =
    Boolean(pkg?.is_bookable) && bookableDates.length > 0;

  useEffect(() => {
    draftHydratedRef.current = false;
    setForm(emptyForm());
    setFieldErrors({});
    setStatusError("");
    setStep("form");

    if (!packageId) {
      setPkg(null);
      setLoadError("");
      setNotFound(false);
      setExistingBooking(null);
      setLoading(false);
      return undefined;
    }

    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setLoadError("");
    setNotFound(false);
    setExistingBooking(null);
    setPkg(null);

    (async () => {
      try {
        const [data, bookings] = await Promise.all([
          getPublishedPackage(packageId),
          listMyBookings().catch(() => []),
        ]);
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setPkg(data);
        const active = findActiveBookingForPackage(bookings, packageId);
        setExistingBooking(active);
        if (active) {
          clearBookingDraft(packageId);
          draftHydratedRef.current = false;
          setForm(emptyForm());
          return;
        }

        const bookable = bookableDateOptions(data.available_dates);
        const bookableIdSet = new Set(bookable.map((row) => String(row.id)));
        const packageBookable =
          Boolean(data.is_bookable) && bookable.length > 0;
        if (!packageBookable) {
          clearBookingDraft(packageId);
        }

        const draft = packageBookable ? loadBookingDraft(packageId) : null;
        const next = emptyForm();
        if (user?.full_name) {
          next.contact_name = String(user.full_name);
        }
        if (user?.email) {
          next.contact_email = String(user.email);
        }
        if (draft) {
          const draftDateId = draft.available_date_id
            ? String(draft.available_date_id)
            : "";
          Object.assign(next, {
            available_date_id: bookableIdSet.has(draftDateId)
              ? draftDateId
              : "",
            travelers:
              draft.travelers != null && draft.travelers !== ""
                ? String(draft.travelers)
                : "1",
            contact_name:
              draft.contact_name != null && draft.contact_name !== ""
                ? String(draft.contact_name)
                : next.contact_name,
            contact_email:
              draft.contact_email != null && draft.contact_email !== ""
                ? String(draft.contact_email)
                : next.contact_email,
            contact_phone:
              draft.contact_phone != null
                ? String(draft.contact_phone)
                : "",
            additional_requirements:
              draft.additional_requirements != null
                ? String(draft.additional_requirements)
                : "",
          });
        }
        setForm(next);
        draftHydratedRef.current = packageBookable;
      } catch (err) {
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setPkg(null);
        setExistingBooking(null);
        if (err instanceof ApiError && err.status === 404) {
          // Confirmed unavailable — drop draft so restore cannot revive it.
          clearBookingDraft(packageId);
          setNotFound(true);
          setLoadError("");
        } else {
          // Transient 5xx/network — keep draft so Retry can restore it.
          setNotFound(false);
          setLoadError(
            err instanceof ApiError
              ? err.message
              : messages.booking.errors.generic,
          );
        }
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      loadGenerationRef.current += 1;
    };
  }, [packageId, user?.email, user?.full_name, loadAttempt]);

  useEffect(() => {
    if (!packageId || !draftHydratedRef.current || !isBookablePackage) {
      return;
    }
    saveBookingDraft(packageId, form);
  }, [form, packageId, isBookablePackage]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleContinue(event) {
    event.preventDefault();
    setStatusError("");
    if (existingBooking?.id || !isBookablePackage) {
      return;
    }
    const errors = validateBookingForm(form, { bookableIds });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep("review");
  }

  async function handleConfirm() {
    if (submittingRef.current || existingBooking?.id || !isBookablePackage) {
      return;
    }
    setStatusError("");
    const errors = validateBookingForm(form, { bookableIds });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStep("form");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const created = await createBooking({
        package_id: packageId,
        available_date_id: form.available_date_id,
        travelers: Number(String(form.travelers).trim()),
        contact_name: String(form.contact_name).trim(),
        contact_email: String(form.contact_email).trim(),
        contact_phone: String(form.contact_phone).trim(),
        additional_requirements: String(
          form.additional_requirements || "",
        ).trim(),
      });
      clearBookingDraft(packageId);
      const reference = created?.reference || "";
      const params = new URLSearchParams();
      // Detail routes key on the booking UUID; reference is display-only (5.3).
      if (created?.id) {
        params.set("booking", String(created.id));
      }
      if (reference) {
        params.set("reference", reference);
      }
      navigate(`/app/bookings/confirmation?${params.toString()}`, {
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const known = {};
        const orphanMessages = [];
        for (const [key, list] of Object.entries(err.fieldErrors || {})) {
          const msg = Array.isArray(list) ? list[0] : String(list);
          if (!msg) {
            continue;
          }
          if (BOOKING_FORM_ERROR_KEYS.has(key)) {
            known[key] = msg;
          } else {
            orphanMessages.push(msg);
          }
        }
        const hasKnownField = Object.keys(known).length > 0;
        if (hasKnownField) {
          setFieldErrors(known);
          setStep("form");
        }
        const nonField = (err.nonFieldErrors || []).find(Boolean);
        const isValidationStatus = err.status === 400 || err.status === 422;
        if (hasKnownField) {
          setStatusError(nonField || "");
        } else if (orphanMessages.length > 0) {
          // Never silently return — orphan keys become a visible status banner.
          setStatusError(
            nonField || orphanMessages.join(" "),
          );
        } else if (nonField && isValidationStatus) {
          setStatusError(nonField);
        } else if (!isValidationStatus) {
          // Ambiguous: request may have reached the server.
          setStatusError(messages.booking.errors.outcomeUnknown);
        } else {
          setStatusError(messages.booking.errors.generic);
        }
      } else {
        // Network / timeout — outcome unknown (not a confirmed failure).
        setStatusError(messages.booking.errors.outcomeUnknown);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const dateId = `${formId}-date`;
  const travelersId = `${formId}-travelers`;
  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const phoneId = `${formId}-phone`;
  const requirementsId = `${formId}-requirements`;
  const statusId = `${formId}-status`;

  if (!packageId) {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        data-testid="booking-form-missing-package"
      >
        <h1 className="text-display-sm m-0">{messages.booking.title}</h1>
        <p className="mt-3 text-body-sm text-[var(--color-muted-foreground)]">
          {messages.booking.missingPackage}
        </p>
        <Link
          to="/explore"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
        >
          {messages.explore.backToExplore}
        </Link>
      </section>
    );
  }

  if (loading) {
    return (
      <p
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 text-[var(--color-muted-foreground)] lg:px-[var(--space-margin-desktop)]"
        aria-busy="true"
        data-testid="booking-form-loading"
      >
        {messages.booking.loading}
      </p>
    );
  }

  if (notFound) {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        data-testid="booking-form-not-found"
      >
        <h1 className="text-display-sm m-0">
          {messages.explore.detailNotFoundTitle}
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {messages.explore.detailNotFoundBody}
        </p>
        <Link
          to="/explore"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
          data-testid="booking-form-not-found-explore"
        >
          {messages.explore.backToExplore}
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        data-testid="booking-form-load-error"
      >
        <p
          className="m-0 text-[var(--color-destructive)]"
          role="alert"
        >
          {loadError}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLoadAttempt((n) => n + 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
            data-testid="booking-form-load-error-retry"
          >
            {messages.booking.retry}
          </button>
          <Link
            to="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
            data-testid="booking-form-load-error-explore"
          >
            {messages.explore.backToExplore}
          </Link>
        </div>
      </section>
    );
  }

  if (existingBooking?.id) {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        data-testid="booking-form-already-booked"
      >
        <h1 className="text-display-sm m-0">
          {messages.booking.alreadyBookedTitle}
        </h1>
        {pkg?.title ? (
          <p className="mt-2 font-semibold">{pkg.title}</p>
        ) : null}
        <p
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-body-sm"
          role="status"
        >
          {messages.booking.alreadyBookedBody}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/app/customer/bookings/${encodeURIComponent(existingBooking.id)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-accent-foreground)] no-underline hover:bg-[var(--color-accent-hover)]"
            data-testid="booking-form-view-booking"
          >
            {messages.booking.alreadyBookedCta}
          </Link>
          <Link
            to={`/explore/${encodeURIComponent(packageId)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
            data-testid="booking-form-back-package"
          >
            {messages.booking.backToPackage}
          </Link>
        </div>
      </section>
    );
  }

  if (!isBookablePackage) {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        data-testid="booking-form-unavailable"
      >
        <h1 className="text-display-sm m-0">{messages.booking.title}</h1>
        {pkg?.title ? (
          <p className="mt-2 font-semibold">{pkg.title}</p>
        ) : null}
        <p
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-body-sm"
          role="status"
        >
          {pkg && !pkg.is_bookable
            ? mapUnavailableReason(pkg.unavailable_reason)
            : messages.booking.noBookableDates}
        </p>
        <Link
          to={`/explore/${packageId}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
        >
          {messages.booking.backToPackage}
        </Link>
      </section>
    );
  }

  if (step === "review") {
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        aria-labelledby="booking-review-heading"
        data-testid="booking-review-page"
      >
        <h1
          id="booking-review-heading"
          className="text-display-sm m-0 text-[var(--color-foreground)]"
        >
          {messages.booking.reviewTitle}
        </h1>
        <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
          {messages.booking.reviewSubtitle}
        </p>

        {statusError ? (
          <p
            className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
            data-testid="booking-review-status-error"
          >
            {statusError}
          </p>
        ) : null}

        <dl
          className="mt-8 m-0 grid gap-3 text-body-sm"
          data-testid="booking-review-summary"
        >
          <div>
            <dt className="inline font-semibold">
              {messages.booking.packageLabel}:{" "}
            </dt>
            <dd className="m-0 inline" data-testid="booking-review-package">
              {pkg.title}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">
              {messages.booking.dateLabel}:{" "}
            </dt>
            <dd className="m-0 inline" data-testid="booking-review-date">
              {selectedDate
                ? formatTourDate(selectedDate.tour_date)
                : form.available_date_id}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">
              {messages.booking.travelersLabel}:{" "}
            </dt>
            <dd className="m-0 inline" data-testid="booking-review-travelers">
              {form.travelers}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">
              {messages.booking.nameLabel}:{" "}
            </dt>
            <dd className="m-0 inline">{form.contact_name}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">
              {messages.booking.emailLabel}:{" "}
            </dt>
            <dd className="m-0 inline">{form.contact_email}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">
              {messages.booking.phoneLabel}:{" "}
            </dt>
            <dd className="m-0 inline">{form.contact_phone}</dd>
          </div>
          {String(form.additional_requirements || "").trim() ? (
            <div>
              <dt className="font-semibold">
                {messages.booking.requirementsLabel}
              </dt>
              <dd className="m-0 mt-1 whitespace-pre-wrap">
                {form.additional_requirements}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            aria-busy={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 font-semibold text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="booking-confirm-submit"
          >
            {submitting
              ? messages.booking.submitting
              : messages.booking.confirmSubmit}
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            data-testid="booking-review-back"
          >
            {messages.booking.backToForm}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="booking-form-heading"
      data-testid="booking-form-page"
    >
      <h1
        id="booking-form-heading"
        className="text-display-sm m-0 text-[var(--color-foreground)]"
      >
        {messages.booking.title}
      </h1>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.booking.subtitle}
      </p>

      <form
        onSubmit={handleContinue}
        noValidate
        className="mt-8 flex flex-col gap-5"
        data-testid="booking-form"
      >
        {statusError ? (
          <p
            id={statusId}
            role="alert"
            className="m-0 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            data-testid="booking-form-status-error"
          >
            {statusError}
          </p>
        ) : null}

        <div>
          <p className={labelClass}>{messages.booking.packageLabel}</p>
          <p
            className="mt-1 m-0 font-semibold"
            data-testid="booking-form-package"
          >
            {pkg.title}
          </p>
        </div>

        <div>
          <label htmlFor={dateId} className={labelClass}>
            {messages.booking.dateLabel}
          </label>
          <p
            id="booking-date-helper"
            className="mt-1 mb-2 text-body-sm text-[var(--color-muted-foreground)]"
            data-testid="booking-date-helper"
          >
            {messages.booking.dateHelper.replace("{minDate}", minBookable)}
          </p>
          <select
            id={dateId}
            name="available_date_id"
            value={form.available_date_id}
            onChange={(e) => updateField("available_date_id", e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.available_date_id)}
            aria-describedby={
              fieldErrors.available_date_id
                ? `${dateId}-error`
                : "booking-date-helper"
            }
            className={`${inputClass} ${
              fieldErrors.available_date_id
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-date"
          >
            <option value="">{messages.booking.datePlaceholder}</option>
            {bookableDates.map((row) => (
              <option key={row.id} value={row.id}>
                {formatTourDate(row.tour_date)}
              </option>
            ))}
          </select>
          <FieldError
            id={`${dateId}-error`}
            message={fieldErrors.available_date_id}
          />
        </div>

        <div>
          <label htmlFor={travelersId} className={labelClass}>
            {messages.booking.travelersLabel}
          </label>
          <input
            id={travelersId}
            name="travelers"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={form.travelers}
            onChange={(e) => updateField("travelers", e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.travelers)}
            aria-describedby={
              fieldErrors.travelers ? `${travelersId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.travelers
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-travelers"
          />
          <FieldError
            id={`${travelersId}-error`}
            message={fieldErrors.travelers}
          />
        </div>

        <div>
          <label htmlFor={nameId} className={labelClass}>
            {messages.booking.nameLabel}
          </label>
          <input
            id={nameId}
            name="contact_name"
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            value={form.contact_name}
            onChange={(e) => updateField("contact_name", e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.contact_name)}
            aria-describedby={
              fieldErrors.contact_name ? `${nameId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.contact_name
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-name"
          />
          <FieldError id={`${nameId}-error`} message={fieldErrors.contact_name} />
        </div>

        <div>
          <label htmlFor={emailId} className={labelClass}>
            {messages.booking.emailLabel}
          </label>
          <input
            id={emailId}
            name="contact_email"
            type="email"
            autoComplete="email"
            value={form.contact_email}
            onChange={(e) => updateField("contact_email", e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.contact_email)}
            aria-describedby={
              fieldErrors.contact_email ? `${emailId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.contact_email
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-email"
          />
          <FieldError
            id={`${emailId}-error`}
            message={fieldErrors.contact_email}
          />
        </div>

        <div>
          <label htmlFor={phoneId} className={labelClass}>
            {messages.booking.phoneLabel}
          </label>
          <input
            id={phoneId}
            name="contact_phone"
            type="tel"
            autoComplete="tel"
            maxLength={PHONE_MAX}
            value={form.contact_phone}
            onChange={(e) => updateField("contact_phone", e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.contact_phone)}
            aria-describedby={
              fieldErrors.contact_phone ? `${phoneId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.contact_phone
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-phone"
          />
          <FieldError
            id={`${phoneId}-error`}
            message={fieldErrors.contact_phone}
          />
        </div>

        <div>
          <label htmlFor={requirementsId} className={labelClass}>
            {messages.booking.requirementsLabel}
          </label>
          <textarea
            id={requirementsId}
            name="additional_requirements"
            value={form.additional_requirements}
            onChange={(e) =>
              updateField("additional_requirements", e.target.value)
            }
            disabled={submitting}
            maxLength={REQUIREMENTS_MAX}
            aria-invalid={Boolean(fieldErrors.additional_requirements)}
            aria-describedby={
              fieldErrors.additional_requirements
                ? `${requirementsId}-error`
                : undefined
            }
            className={`${textareaClass} ${
              fieldErrors.additional_requirements
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
            data-testid="booking-form-requirements"
          />
          <FieldError
            id={`${requirementsId}-error`}
            message={fieldErrors.additional_requirements}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 font-semibold text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="booking-form-continue"
        >
          {messages.booking.continueToReview}
        </button>
      </form>
    </section>
  );
}
