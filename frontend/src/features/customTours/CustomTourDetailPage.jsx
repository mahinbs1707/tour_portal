import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { canPayNow } from "../bookings/canPayNow.js";
import { formatSubmittedAt } from "../bookings/bookingFormat.js";
import { OfflinePayBanner } from "../bookings/OfflinePayBanner.jsx";
import { PaymentWindowCountdown } from "../bookings/PaymentWindowCountdown.jsx";
import { useOnlineStatus } from "../bookings/useOnlineStatus.js";
import { CustomTourStatusChip } from "./CustomTourStatusChip.jsx";
import { formatCustomTourDateRange } from "./customTourFormat.js";
import { getCustomTour } from "./customToursApi.js";

const chipClass =
  "inline-flex rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-body-sm font-semibold";

function statusText(map, value) {
  if (!value) {
    return messages.booking.statusNotAvailable;
  }
  return map[value] || value;
}

function DetailRow({ label, children, testId }) {
  return (
    <div>
      <dt className="text-label text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="m-0 mt-1 whitespace-pre-wrap" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}

/** Customer custom tour detail — rejection guidance when present (Story 8.2). */
export function CustomTourDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const online = useOnlineStatus();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const generationRef = useRef(0);
  const paySuccessTitle = location.state?.paySuccessTitle;

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setNotFound(false);
    setLoadError("");
    try {
      const data = await getCustomTour(id);
      if (generation !== generationRef.current) {
        return;
      }
      setTour(data);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setTour(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(messages.customTour.historyErrors.detailGeneric);
      }
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  if (loading) {
    return (
      <p
        className="text-[var(--color-muted-foreground)]"
        aria-busy="true"
        data-testid="custom-tour-detail-loading"
      >
        {messages.customTour.detailLoading}
      </p>
    );
  }

  if (notFound) {
    return (
      <section data-testid="custom-tour-detail-not-found">
        <h1 className="text-display-sm m-0">{messages.customTour.detailNotFoundTitle}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {messages.customTour.detailNotFoundBody}
        </p>
        <Link
          to="/app/customer/custom-tours"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
        >
          {messages.customTour.backToHistory}
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section data-testid="custom-tour-detail-error">
        <p className="text-[var(--color-destructive)]" role="alert">
          {loadError}
        </p>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
          onClick={load}
        >
          {messages.booking.retry}
        </button>
      </section>
    );
  }

  if (!tour) {
    return null;
  }

  const rejectionReason = String(tour.rejection_reason || "").trim();
  const adjustments = String(tour.recommended_adjustments || "").trim();
  const showPayNow = canPayNow(tour);

  return (
    <section
      aria-labelledby="custom-tour-detail-heading"
      data-testid="custom-tour-detail-page"
    >
      <Link
        to="/app/customer/custom-tours"
        className="text-body-sm font-semibold text-[var(--color-primary)] no-underline"
      >
        {messages.customTour.backToHistory}
      </Link>

      <h1
        id="custom-tour-detail-heading"
        className="text-display-sm m-0 mt-4"
      >
        {messages.customTour.detailTitle}
      </h1>
      <p className="mt-2 text-headline m-0">{tour.title}</p>

      {paySuccessTitle ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border-2 border-[var(--color-success)] bg-[var(--color-status-approved-bg)] px-4 py-3 text-[0.95rem] font-semibold leading-snug text-[var(--color-status-approved-fg)] shadow-[var(--shadow-panel)]"
          role="status"
          data-testid="custom-tour-pay-success"
        >
          {messages.customTour.paySuccess.replace("{title}", String(paySuccessTitle))}
        </p>
      ) : null}

      <ul
        className="mt-6 m-0 flex list-none flex-wrap gap-3 p-0"
        aria-label={messages.booking.statusesTitle}
        data-testid="custom-tour-detail-status-chips"
      >
        <li className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-muted-foreground)]">
            {messages.customTour.statusLabel}
          </span>
          <CustomTourStatusChip
            status={tour.status}
            testId="custom-tour-detail-status"
          />
        </li>
        <li className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-muted-foreground)]">
            {messages.booking.paymentStatusChip}
          </span>
          <span
            className={chipClass}
            data-testid="custom-tour-detail-payment-status"
            data-status={tour.payment_status || ""}
          >
            {statusText(messages.booking.paymentStatus, tour.payment_status)}
          </span>
        </li>
        <li className="flex flex-col gap-1">
          <span className="text-label text-[var(--color-muted-foreground)]">
            {messages.booking.windowStatusChip}
          </span>
          <span
            className={chipClass}
            data-testid="custom-tour-detail-window-status"
            data-status={tour.payment_window_status || ""}
          >
            {statusText(
              messages.booking.windowStatus,
              tour.payment_window_status,
            )}
          </span>
        </li>
      </ul>

      <PaymentWindowCountdown
        booking={tour}
        testIdPrefix="custom-tour-detail-countdown"
      />

      {!online && showPayNow ? (
        <OfflinePayBanner testId="custom-tour-detail-offline-banner" />
      ) : null}

      {showPayNow ? (
        <div className="mt-6">
          <Link
            to={`/app/customer/custom-tours/${encodeURIComponent(tour.id)}/pay`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 font-semibold text-[var(--color-accent-foreground)] no-underline hover:bg-[var(--color-accent-hover)]"
            data-testid="custom-tour-pay-now"
            aria-disabled={!online}
            onClick={(event) => {
              if (!online) {
                event.preventDefault();
              }
            }}
          >
            {messages.booking.payNow}
          </Link>
        </div>
      ) : null}

      <dl className="mt-8 space-y-4 border-t border-[var(--color-border)] pt-6">
        <DetailRow label={messages.customTour.destinationLabel} testId="custom-tour-detail-destination">
          {tour.destination}
        </DetailRow>
        <DetailRow label={messages.customTour.datesLabel} testId="custom-tour-detail-dates">
          {formatCustomTourDateRange(tour.start_date, tour.end_date)}
        </DetailRow>
        <DetailRow label={messages.customTour.travelersLabel} testId="custom-tour-detail-travelers">
          {tour.travelers}
        </DetailRow>
        <DetailRow label={messages.customTour.budgetLabel} testId="custom-tour-detail-budget">
          {tour.estimated_budget} {tour.currency}
        </DetailRow>
        <DetailRow label={messages.customTour.submittedAtLabel} testId="custom-tour-detail-submitted">
          {formatSubmittedAt(tour.created_at)}
        </DetailRow>
        {tour.accommodation_preferences ? (
          <DetailRow label={messages.customTour.accommodationLabel}>
            {tour.accommodation_preferences}
          </DetailRow>
        ) : null}
        {tour.transportation_preferences ? (
          <DetailRow label={messages.customTour.transportationLabel}>
            {tour.transportation_preferences}
          </DetailRow>
        ) : null}
        {tour.preferred_activities ? (
          <DetailRow label={messages.customTour.activitiesLabel}>
            {tour.preferred_activities}
          </DetailRow>
        ) : null}
        {tour.additional_requirements ? (
          <DetailRow label={messages.customTour.requirementsLabel}>
            {tour.additional_requirements}
          </DetailRow>
        ) : null}
      </dl>

      {rejectionReason ? (
        <div
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          data-testid="custom-tour-rejection-guidance"
        >
          <h2 className="text-headline m-0">{messages.customTour.rejectionTitle}</h2>
          <p className="mt-2 m-0 whitespace-pre-wrap">{rejectionReason}</p>
          {adjustments ? (
            <>
              <h3 className="text-label mt-4 mb-0">{messages.customTour.adjustmentsTitle}</h3>
              <p className="mt-2 m-0 whitespace-pre-wrap">{adjustments}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {Array.isArray(tour.review_history) && tour.review_history.length > 0 ? (
        <section
          className="mt-8"
          aria-labelledby="custom-tour-review-history-heading"
          data-testid="custom-tour-review-history"
        >
          <h2
            id="custom-tour-review-history-heading"
            className="text-headline m-0"
          >
            {messages.customTour.reviewHistoryTitle}
          </h2>
          <ul className="mt-4 list-none space-y-4 p-0">
            {tour.review_history.map((entry) => (
              <li
                key={entry.cycle}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                data-testid={`custom-tour-review-history-cycle-${entry.cycle}`}
              >
                <p className="m-0 text-label font-semibold">
                  {messages.customTour.reviewHistoryCycleLabel.replace(
                    "{cycle}",
                    String(entry.cycle),
                  )}
                </p>
                <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
                  <CustomTourStatusChip
                    status={entry.decision}
                    testId={`custom-tour-history-decision-${entry.cycle}`}
                  />
                </p>
                {entry.rejection_reason ? (
                  <p className="mt-2 m-0 whitespace-pre-wrap">
                    {entry.rejection_reason}
                  </p>
                ) : null}
                {entry.recommended_adjustments ? (
                  <p className="mt-2 m-0 whitespace-pre-wrap text-body-sm text-[var(--color-muted-foreground)]">
                    {entry.recommended_adjustments}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tour.status === "REJECTED" ? (
        <div className="mt-6">
          <p
            className="text-body-sm text-[var(--color-muted-foreground)]"
            data-testid="custom-tour-reapply-status"
            role="status"
          >
            {tour.reapply_enabled
              ? messages.customTour.reapplyEnabledHint
              : messages.customTour.reapplyDisabledHint}
          </p>
          {tour.reapply_enabled ? (
            <Link
              to={`/app/customer/custom-tours/${encodeURIComponent(tour.id)}/reapply`}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]"
              data-testid="custom-tour-reapply-cta"
            >
              {messages.customTour.reapplyCta}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}