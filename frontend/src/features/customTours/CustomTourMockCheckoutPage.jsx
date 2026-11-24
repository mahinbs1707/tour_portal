import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { canPayNow } from "../bookings/canPayNow.js";
import { MockPaymentCheckoutForm } from "../bookings/MockPaymentCheckoutForm.jsx";
import { OfflinePayBanner } from "../bookings/OfflinePayBanner.jsx";
import { useOnlineStatus } from "../bookings/useOnlineStatus.js";
import { formatCustomTourDateRange } from "./customTourFormat.js";
import {
  getCustomTour,
  submitCustomTourPaymentAttempt,
} from "./customToursApi.js";

/**
 * Checkout for approved custom tours (mock provider; same UX as booking Pay Now).
 */
export function CustomTourMockCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attemptError, setAttemptError] = useState("");
  const submittingRef = useRef(false);
  const generationRef = useRef(0);

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
    setAttemptError("");
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  const online = useOnlineStatus();

  async function handleSimulate(outcome) {
    if (submittingRef.current || !tour || !canPayNow(tour) || !online) {
      return;
    }
    const errors = messages.booking.checkoutErrors;
    submittingRef.current = true;
    setSubmitting(true);
    setAttemptError("");
    try {
      await submitCustomTourPaymentAttempt(tour.id, outcome);
      if (outcome === "SUCCESS") {
        navigate(`/app/customer/custom-tours/${tour.id}`, {
          replace: true,
          state: { paySuccessTitle: tour.title },
        });
        return;
      }
      const refreshed = await getCustomTour(tour.id);
      setTour(refreshed);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAttemptError(errors.alreadyPaid);
      } else if (err instanceof ApiError && err.status === 403) {
        setAttemptError(errors.ineligible);
        load();
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setAttemptError(errors.generic);
      } else {
        setAttemptError(errors.outcomeUnknown);
        load();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const eligible = Boolean(tour && canPayNow(tour));
  const controlsDisabled = submitting || !online;

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-10 lg:px-[var(--space-margin-desktop)] lg:py-14"
      data-testid="custom-tour-mock-checkout-page"
      aria-labelledby="custom-tour-mock-checkout-heading"
    >
      <Link
        to={`/app/customer/custom-tours/${id}`}
        className="inline-flex min-h-11 items-center text-body-sm font-semibold text-[var(--color-primary)]"
        data-testid="custom-tour-mock-checkout-back"
      >
        {messages.customTour.checkoutBackToDetail}
      </Link>

      <h1
        id="custom-tour-mock-checkout-heading"
        className="text-display-sm mt-3 mb-0"
      >
        {messages.customTour.checkoutTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-body-sm text-[var(--color-muted-foreground)]">
        {messages.customTour.checkoutSubtitle}
      </p>

      {loading ? (
        <p className="mt-8 text-[var(--color-muted-foreground)]" aria-busy="true">
          {messages.customTour.detailLoading}
        </p>
      ) : null}

      {!loading && notFound ? (
        <div className="mt-8">
          <p>{messages.customTour.detailNotFoundBody}</p>
        </div>
      ) : null}

      {!loading && loadError ? (
        <p className="mt-8 text-[var(--color-destructive)]" role="alert">
          {loadError}
        </p>
      ) : null}

      {!online ? <OfflinePayBanner testId="custom-tour-checkout-offline-banner" /> : null}

      {attemptError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {attemptError}
        </p>
      ) : null}

      {!loading && tour ? (
        <>
          {!eligible ? (
            <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <h2 className="text-headline m-0">
                {messages.booking.checkoutIneligibleTitle}
              </h2>
              <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
                {messages.customTour.checkoutIneligibleBody}
              </p>
            </div>
          ) : (
            <MockPaymentCheckoutForm
              title={tour.title}
              referenceLine={tour.title}
              amount={tour.estimated_budget}
              currency={tour.currency}
              metaRows={[
                {
                  label: messages.booking.checkoutTravelDateLabel,
                  value: formatCustomTourDateRange(tour.start_date, tour.end_date),
                },
                {
                  label: messages.booking.checkoutTravelersLabel,
                  value: String(tour.travelers ?? ""),
                },
              ]}
              bookingForCountdown={tour}
              countdownTestIdPrefix="custom-tour-checkout-countdown"
              deadlineAt={tour.payment_window_deadline_at}
              disabled={controlsDisabled}
              submitting={submitting}
              onPaySuccess={() => handleSimulate("SUCCESS")}
              onSimulateFailed={() => handleSimulate("FAILED")}
              onSimulateCancelled={() => handleSimulate("CANCELLED")}
              successTestId="custom-tour-checkout-simulate-success"
              failedTestId="custom-tour-checkout-simulate-failed"
              cancelledTestId="custom-tour-checkout-simulate-cancelled"
              amountTestId="custom-tour-checkout-amount"
              referenceTestId="custom-tour-checkout-title"
            />
          )}
        </>
      ) : null}
    </section>
  );
}
