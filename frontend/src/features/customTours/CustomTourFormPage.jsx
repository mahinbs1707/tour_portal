import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import {
  isWithinAdvanceWindow,
  minBookableDateIso,
} from "../packages/packagesApi.js";
import {
  createCustomTour,
  getCustomTour,
  reapplyCustomTour,
} from "./customToursApi.js";

const TITLE_MAX = 255;
const DESTINATION_MAX = 500;
const TEXT_MAX = 2000;
const CURRENCY_MAX = 16;

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";
const textareaClass = `${inputClass} min-h-24 py-2`;

export const CUSTOM_TOUR_FORM_ERROR_KEYS = new Set([
  "title",
  "destination",
  "start_date",
  "end_date",
  "travelers",
  "estimated_budget",
  "currency",
  "accommodation_preferences",
  "transportation_preferences",
  "preferred_activities",
  "additional_requirements",
]);

export function emptyCustomTourForm() {
  return {
    title: "",
    destination: "",
    start_date: "",
    end_date: "",
    travelers: "1",
    estimated_budget: "",
    currency: "BDT",
    accommodation_preferences: "",
    transportation_preferences: "",
    preferred_activities: "",
    additional_requirements: "",
  };
}

/** @param {Record<string, unknown>} tour */
export function formFromTour(tour) {
  return {
    title: tour.title || "",
    destination: tour.destination || "",
    start_date: tour.start_date || "",
    end_date: tour.end_date || "",
    travelers: String(tour.travelers ?? "1"),
    estimated_budget:
      tour.estimated_budget != null ? String(tour.estimated_budget) : "",
    currency: tour.currency || "BDT",
    accommodation_preferences: tour.accommodation_preferences || "",
    transportation_preferences: tour.transportation_preferences || "",
    preferred_activities: tour.preferred_activities || "",
    additional_requirements: tour.additional_requirements || "",
  };
}

/**
 * @param {ReturnType<typeof emptyCustomTourForm>} form
 * @param {{ minStartIso: string }} ctx
 */
export function validateCustomTourForm(form, { minStartIso }) {
  const errors = {};

  const title = String(form.title || "").trim();
  if (!title) {
    errors.title = messages.customTour.errors.titleRequired;
  } else if (title.length > TITLE_MAX) {
    errors.title = messages.customTour.errors.titleTooLong.replace(
      "{max}",
      String(TITLE_MAX),
    );
  }

  const destination = String(form.destination || "").trim();
  if (!destination) {
    errors.destination = messages.customTour.errors.destinationRequired;
  } else if (destination.length > DESTINATION_MAX) {
    errors.destination = messages.customTour.errors.destinationTooLong.replace(
      "{max}",
      String(DESTINATION_MAX),
    );
  }

  const start = String(form.start_date || "").trim();
  if (!start) {
    errors.start_date = messages.customTour.errors.startRequired;
  } else if (isWithinAdvanceWindow(start)) {
    errors.start_date = messages.customTour.errors.startTooSoon;
  } else if (minStartIso && start < minStartIso) {
    errors.start_date = messages.customTour.errors.startTooSoon;
  }

  const end = String(form.end_date || "").trim();
  if (!end) {
    errors.end_date = messages.customTour.errors.endRequired;
  } else if (start && end < start) {
    errors.end_date = messages.customTour.errors.endBeforeStart;
  }

  const travelersRaw = String(form.travelers ?? "").trim();
  const travelers = Number(travelersRaw);
  if (!travelersRaw) {
    errors.travelers = messages.customTour.errors.travelersRequired;
  } else if (!Number.isInteger(travelers) || travelers < 1) {
    errors.travelers = messages.customTour.errors.travelersInvalid;
  }

  const budgetRaw = String(form.estimated_budget ?? "").trim();
  const budget = Number(budgetRaw);
  if (!budgetRaw) {
    errors.estimated_budget = messages.customTour.errors.budgetRequired;
  } else if (!Number.isFinite(budget) || budget <= 0) {
    errors.estimated_budget = messages.customTour.errors.budgetInvalid;
  }

  const currency = String(form.currency || "").trim();
  if (!currency) {
    errors.currency = messages.customTour.errors.currencyRequired;
  } else if (currency.length > CURRENCY_MAX) {
    errors.currency = messages.customTour.errors.currencyTooLong.replace(
      "{max}",
      String(CURRENCY_MAX),
    );
  }

  for (const key of [
    "accommodation_preferences",
    "transportation_preferences",
    "preferred_activities",
    "additional_requirements",
  ]) {
    const value = String(form[key] || "");
    if (value.length > TEXT_MAX) {
      errors[key] = messages.customTour.errors.fieldTooLong.replace(
        "{max}",
        String(TEXT_MAX),
      );
    }
  }

  return errors;
}

export function buildApiPayload(form) {
  return {
    title: String(form.title).trim(),
    destination: String(form.destination).trim(),
    start_date: String(form.start_date).trim(),
    end_date: String(form.end_date).trim(),
    travelers: Number(form.travelers),
    estimated_budget: String(form.estimated_budget).trim(),
    currency: String(form.currency).trim(),
    accommodation_preferences: String(
      form.accommodation_preferences || "",
    ).trim(),
    transportation_preferences: String(
      form.transportation_preferences || "",
    ).trim(),
    preferred_activities: String(form.preferred_activities || "").trim(),
    additional_requirements: String(form.additional_requirements || "").trim(),
  };
}

function ReviewRow({ label, value }) {
  if (!value) {
    return null;
  }
  return (
    <div>
      <dt className="text-label text-[var(--color-muted-foreground)]">
        {label}
      </dt>
      <dd className="m-0 mt-1 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function CustomTourFormPage({ variant = "create", tourId = null } = {}) {
  const isReapply = variant === "reapply";
  const formId = useId();
  const navigate = useNavigate();
  const minStartIso = useMemo(() => minBookableDateIso(), []);
  const [form, setForm] = useState(emptyCustomTourForm);
  const [step, setStep] = useState("form");
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingTour, setLoadingTour] = useState(isReapply);
  const [reapplyBlocked, setReapplyBlocked] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const loadGenerationRef = useRef(0);

  const loadReapplyTour = useCallback(async () => {
    if (!isReapply || !tourId) {
      return;
    }
    const generation = ++loadGenerationRef.current;
    setLoadingTour(true);
    setReapplyBlocked(false);
    setStatusError("");
    try {
      const data = await getCustomTour(tourId);
      if (generation !== loadGenerationRef.current) {
        return;
      }
      if (data.status !== "REJECTED" || !data.reapply_enabled) {
        setReapplyBlocked(true);
        return;
      }
      setForm(formFromTour(data));
    } catch {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setReapplyBlocked(true);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoadingTour(false);
      }
    }
  }, [isReapply, tourId]);

  useEffect(() => {
    loadReapplyTour();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadReapplyTour]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setStatusError("");
  }

  function handleContinue() {
    const errors = validateCustomTourForm(form, { minStartIso });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setStep("review");
  }

  async function handleSubmit() {
    const errors = validateCustomTourForm(form, { minStartIso });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStep("form");
      return;
    }
    if (submittingRef.current) {
      return;
    }
    if (!isReapply) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `ct-${Date.now()}`;
      }
    }
    submittingRef.current = true;
    setSubmitting(true);
    setStatusError("");
    setFieldErrors({});
    try {
      const payload = buildApiPayload(form);
      if (isReapply) {
        const updated = await reapplyCustomTour(tourId, payload);
        const id = updated?.id || tourId;
        navigate(`/app/customer/custom-tours/${encodeURIComponent(id)}`, {
          replace: true,
        });
        return;
      }
      const created = await createCustomTour(payload, {
        idempotencyKey: idempotencyKeyRef.current,
      });
      const id = created?.id;
      if (!id) {
        setStatusError(messages.customTour.errors.outcomeUnknown);
        return;
      }
      navigate(
        `/app/customer/custom-tours/confirmation?id=${encodeURIComponent(id)}`,
        { replace: true },
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const merged = { ...err.fieldErrors };
        setFieldErrors(merged);
        const nonField = err.nonFieldErrors?.[0];
        const isValidationStatus = err.status === 400;
        if (Object.keys(merged).length > 0) {
          setStep("form");
        }
        if (nonField) {
          setStatusError(nonField);
        } else if (err.status === 403 && isReapply) {
          setStatusError(messages.customTour.reapplyNotAllowedBody);
        } else if (!isValidationStatus) {
          setStatusError(messages.customTour.errors.outcomeUnknown);
        } else if (Object.keys(merged).length === 0) {
          setStatusError(messages.customTour.errors.generic);
        }
      } else {
        setStatusError(messages.customTour.errors.outcomeUnknown);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const pageTitle = isReapply
    ? messages.customTour.reapplyTitle
    : messages.customTour.title;
  const pageSubtitle = isReapply
    ? messages.customTour.reapplySubtitle
    : messages.customTour.subtitle;
  const reviewSubtitle = isReapply
    ? messages.customTour.reapplyReviewSubtitle
    : messages.customTour.reviewSubtitle;
  const confirmLabel = isReapply
    ? messages.customTour.confirmReapply
    : messages.customTour.confirmSubmit;

  if (loadingTour) {
    return (
      <p
        className="text-[var(--color-muted-foreground)]"
        aria-busy="true"
        data-testid="custom-tour-reapply-loading"
      >
        {messages.customTour.detailLoading}
      </p>
    );
  }

  if (reapplyBlocked) {
    return (
      <section data-testid="custom-tour-reapply-blocked">
        <h1 className="text-display-sm m-0">{messages.customTour.reapplyNotAllowedTitle}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {messages.customTour.reapplyNotAllowedBody}
        </p>
        {tourId ? (
          <Link
            to={`/app/customer/custom-tours/${encodeURIComponent(tourId)}`}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
          >
            {messages.customTour.viewDetails}
          </Link>
        ) : null}
      </section>
    );
  }

  const dateHelper = messages.customTour.dateHelper.replace(
    "{minDate}",
    minStartIso,
  );

  if (step === "review") {
    const payload = buildApiPayload(form);
    return (
      <section
        className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        aria-labelledby="custom-tour-review-heading"
        data-testid="custom-tour-review-page"
      >
        <h1
          id="custom-tour-review-heading"
          className="text-display-sm m-0 text-[var(--color-foreground)]"
        >
          {messages.customTour.reviewTitle}
        </h1>
        <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
          {reviewSubtitle}
        </p>
        <dl className="mt-8 space-y-4 border-t border-[var(--color-border)] pt-6">
          <ReviewRow label={messages.customTour.titleLabel} value={payload.title} />
          <ReviewRow
            label={messages.customTour.destinationLabel}
            value={payload.destination}
          />
          <ReviewRow
            label={messages.customTour.startDateLabel}
            value={payload.start_date}
          />
          <ReviewRow
            label={messages.customTour.endDateLabel}
            value={payload.end_date}
          />
          <ReviewRow
            label={messages.customTour.travelersLabel}
            value={String(payload.travelers)}
          />
          <ReviewRow
            label={messages.customTour.budgetLabel}
            value={`${payload.estimated_budget} ${payload.currency}`}
          />
          <ReviewRow
            label={messages.customTour.accommodationLabel}
            value={payload.accommodation_preferences}
          />
          <ReviewRow
            label={messages.customTour.transportationLabel}
            value={payload.transportation_preferences}
          />
          <ReviewRow
            label={messages.customTour.activitiesLabel}
            value={payload.preferred_activities}
          />
          <ReviewRow
            label={messages.customTour.requirementsLabel}
            value={payload.additional_requirements}
          />
        </dl>
        {statusError ? (
          <p className={`mt-4 ${errorClass}`} role="alert">
            {statusError}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            disabled={submitting}
          >
            {messages.customTour.backToForm}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            disabled={submitting}
            data-testid="custom-tour-confirm-submit"
          >
            {submitting ? messages.customTour.submitting : confirmLabel}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="custom-tour-form-heading"
      data-testid="custom-tour-form-page"
    >
      <h1
        id="custom-tour-form-heading"
        className="text-display-sm m-0 text-[var(--color-foreground)]"
      >
        {pageTitle}
      </h1>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {pageSubtitle}
      </p>
      {!isReapply ? (
        <p
          className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-body-sm"
          role="status"
        >
          {messages.customTour.privacyNote}
        </p>
      ) : null}

      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleContinue();
        }}
      >
        <div>
          <label htmlFor={`${formId}-title`} className={labelClass}>
            {messages.customTour.titleLabel}
          </label>
          <input
            id={`${formId}-title`}
            className={inputClass}
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {fieldErrors.title ? (
            <p className={errorClass} role="alert">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${formId}-destination`} className={labelClass}>
            {messages.customTour.destinationLabel}
          </label>
          <input
            id={`${formId}-destination`}
            className={inputClass}
            value={form.destination}
            onChange={(e) => updateField("destination", e.target.value)}
            aria-invalid={Boolean(fieldErrors.destination)}
          />
          {fieldErrors.destination ? (
            <p className={errorClass} role="alert">
              {fieldErrors.destination}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${formId}-start`} className={labelClass}>
            {messages.customTour.startDateLabel}
          </label>
          <input
            id={`${formId}-start`}
            type="date"
            min={minStartIso}
            className={inputClass}
            value={form.start_date}
            onChange={(e) => updateField("start_date", e.target.value)}
            aria-invalid={Boolean(fieldErrors.start_date)}
          />
          <p className="mt-1 text-body-sm text-[var(--color-muted-foreground)]">
            {dateHelper}
          </p>
          {fieldErrors.start_date ? (
            <p className={errorClass} role="alert">
              {fieldErrors.start_date}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${formId}-end`} className={labelClass}>
            {messages.customTour.endDateLabel}
          </label>
          <input
            id={`${formId}-end`}
            type="date"
            min={form.start_date || minStartIso}
            className={inputClass}
            value={form.end_date}
            onChange={(e) => updateField("end_date", e.target.value)}
            aria-invalid={Boolean(fieldErrors.end_date)}
          />
          {fieldErrors.end_date ? (
            <p className={errorClass} role="alert">
              {fieldErrors.end_date}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${formId}-travelers`} className={labelClass}>
            {messages.customTour.travelersLabel}
          </label>
          <input
            id={`${formId}-travelers`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className={inputClass}
            value={form.travelers}
            onChange={(e) => updateField("travelers", e.target.value)}
            aria-invalid={Boolean(fieldErrors.travelers)}
          />
          {fieldErrors.travelers ? (
            <p className={errorClass} role="alert">
              {fieldErrors.travelers}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-budget`} className={labelClass}>
              {messages.customTour.budgetLabel}
            </label>
            <input
              id={`${formId}-budget`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={form.estimated_budget}
              onChange={(e) => updateField("estimated_budget", e.target.value)}
              aria-invalid={Boolean(fieldErrors.estimated_budget)}
            />
            {fieldErrors.estimated_budget ? (
              <p className={errorClass} role="alert">
                {fieldErrors.estimated_budget}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={`${formId}-currency`} className={labelClass}>
              {messages.customTour.currencyLabel}
            </label>
            <input
              id={`${formId}-currency`}
              className={inputClass}
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              aria-invalid={Boolean(fieldErrors.currency)}
            />
            {fieldErrors.currency ? (
              <p className={errorClass} role="alert">
                {fieldErrors.currency}
              </p>
            ) : null}
          </div>
        </div>

        {[
          ["accommodation_preferences", messages.customTour.accommodationLabel],
          [
            "transportation_preferences",
            messages.customTour.transportationLabel,
          ],
          ["preferred_activities", messages.customTour.activitiesLabel],
          ["additional_requirements", messages.customTour.requirementsLabel],
        ].map(([name, label]) => (
          <div key={name}>
            <label htmlFor={`${formId}-${name}`} className={labelClass}>
              {label}
            </label>
            <textarea
              id={`${formId}-${name}`}
              className={textareaClass}
              value={form[name]}
              onChange={(e) => updateField(name, e.target.value)}
              aria-invalid={Boolean(fieldErrors[name])}
            />
            {fieldErrors[name] ? (
              <p className={errorClass} role="alert">
                {fieldErrors[name]}
              </p>
            ) : null}
          </div>
        ))}

        {statusError ? (
          <p className={errorClass} role="alert">
            {statusError}
          </p>
        ) : null}

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
          data-testid="custom-tour-continue-review"
        >
          {messages.customTour.continueToReview}
        </button>
      </form>
    </section>
  );
}