import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { canPayNow } from "./canPayNow.js";
import { formatTourDate } from "../packages/PackageDetailPage.jsx";
import { getBooking, submitPaymentAttempt } from "./bookingsApi.js";
import { MockPaymentCheckoutForm } from "./MockPaymentCheckoutForm.jsx";
import { OfflinePayBanner } from "./OfflinePayBanner.jsx";
import { useOnlineStatus } from "./useOnlineStatus.js";

/**
 * Full-page checkout (Story 7.2). Mock provider only — card fields never leave the browser.
 */
export function MockCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
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
      const data = await getBooking(id);
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(data);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(messages.booking.historyErrors.detailGeneric);
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
    if (submittingRef.current || !booking || !canPayNow(booking) || !online) {
      return;
    }
    const errors = messages.booking.checkoutErrors;
    submittingRef.current = true;
    setSubmitting(true);
    setAttemptError("");
    try {
      await submitPaymentAttempt(booking.id, outcome);
      if (outcome === "SUCCESS") {
        navigate(`/app/customer/bookings/${booking.id}`, {
          replace: true,
          state: { paySuccessReference: booking.reference },
        });
        return;
      }
      const refreshed = await getBooking(booking.id);
      setBooking(refreshed);
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

  const eligible = Boolean(booking && canPayNow(booking));
  const controlsDisabled = submitting || !online;

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-10 lg:px-[var(--space-margin-desktop)] lg:py-14"
      data-testid="mock-checkout-page"
      aria-labelledby="mock-checkout-heading"
    >
      <Link
        to={`/app/customer/bookings/${id}`}
        className="inline-flex min-h-11 items-center text-body-sm font-semibold text-[var(--color-primary)]"
        data-testid="mock-checkout-back"
      >
        {messages.booking.checkoutBackToDetail}
      </Link>

      <h1 id="mock-checkout-heading" className="text-display-sm mt-3 mb-0">
        {messages.booking.checkoutTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-body-sm text-[var(--color-muted-foreground)]">
        {messages.booking.checkoutSubtitle}
      </p>

      {loading ? (
        <p className="mt-8 text-[var(--color-muted-foreground)]" aria-busy="true">
          {messages.booking.detailLoading}
        </p>
      ) : null}

      {!loading && notFound ? (
        <div className="mt-8" data-testid="mock-checkout-not-found">
          <p>{messages.booking.detailNotFoundBody}</p>
        </div>
      ) : null}

      {!loading && loadError ? (
        <p className="mt-8 text-[var(--color-destructive)]" role="alert">
          {loadError}
        </p>
      ) : null}

      {!online ? <OfflinePayBanner testId="mock-checkout-offline-banner" /> : null}

      {attemptError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="mock-checkout-error"
        >
          {attemptError}
        </p>
      ) : null}

      {!loading && booking ? (
        <>
          {!eligible ? (
            <div
              className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              data-testid="mock-checkout-ineligible"
            >
              <h2 className="text-headline m-0">
                {messages.booking.checkoutIneligibleTitle}
              </h2>
              <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
                {messages.booking.checkoutIneligibleBody}
              </p>
            </div>
          ) : (
            <MockPaymentCheckoutForm
              title={booking.package_title}
              referenceLine={messages.booking.checkoutReference.replace(
                "{reference}",
                booking.reference,
              )}
              amount={booking.amount_due}
              currency={booking.currency}
              metaRows={[
                {
                  label: messages.booking.checkoutTravelDateLabel,
                  value: formatTourDate(booking.tour_date),
                },
                {
                  label: messages.booking.checkoutTravelersLabel,
                  value: String(booking.travelers ?? ""),
                },
              ]}
              bookingForCountdown={booking}
              countdownTestIdPrefix="mock-checkout-countdown"
              deadlineAt={booking.payment_window_deadline_at}
              disabled={controlsDisabled}
              submitting={submitting}
              onPaySuccess={() => handleSimulate("SUCCESS")}
              onSimulateFailed={() => handleSimulate("FAILED")}
              onSimulateCancelled={() => handleSimulate("CANCELLED")}
              successTestId="mock-checkout-simulate-success"
              failedTestId="mock-checkout-simulate-failed"
              cancelledTestId="mock-checkout-simulate-cancelled"
              amountTestId="mock-checkout-amount"
              referenceTestId="mock-checkout-reference"
            />
          )}
        </>
      ) : null}
    </section>
  );
}
