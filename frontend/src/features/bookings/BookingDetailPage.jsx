import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { ConfirmDialog } from "../packages/ConfirmDialog.jsx";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { formatSubmittedAt } from "./bookingFormat.js";
import { canPayNow } from "./canPayNow.js";
import { cancelBooking, getBooking } from "./bookingsApi.js";
import { OfflinePayBanner } from "./OfflinePayBanner.jsx";
import { PaymentWindowCountdown } from "./PaymentWindowCountdown.jsx";
import { useOnlineStatus } from "./useOnlineStatus.js";

function DetailRow({ label, children, testId }) {
  return (
    <div>
      <dt className="text-label text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="m-0 mt-1" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}

/** Customer booking detail — cancel while PENDING (5.3); Pay now when eligible (7.2). */
export function BookingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [paySuccess, setPaySuccess] = useState("");
  const generationRef = useRef(0);
  const cancellingRef = useRef(false);

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
    // New :id — drop cancel UI state from the previous booking.
    setConfirmOpen(false);
    setCancelError("");
    setCancelSuccess("");
    setPaySuccess("");
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const reference = location.state?.paySuccessReference;
    if (reference) {
      setPaySuccess(messages.booking.paySuccess.replace("{reference}", reference));
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  async function handleCancelConfirm() {
    if (cancellingRef.current || !booking) {
      return;
    }
    cancellingRef.current = true;
    setCancelling(true);
    setCancelError("");
    setCancelSuccess("");
    try {
      const updated = await cancelBooking(booking.id);
      setBooking(updated);
      setCancelSuccess(
        messages.booking.cancelSuccess.replace("{reference}", updated.reference),
      );
      setConfirmOpen(false);
    } catch (err) {
      setConfirmOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        setCancelError(messages.booking.historyErrors.cancelNotPending);
        // Booking changed underneath us — refresh live status (Cancel disappears).
        load();
      } else if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
        setNotFound(true);
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setCancelError(messages.booking.historyErrors.cancelGeneric);
      } else {
        // Network/timeout/5xx: the cancel may or may not have been applied.
        setCancelError(messages.booking.historyErrors.cancelOutcomeUnknown);
        load();
      }
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  }

  const online = useOnlineStatus();
  const canCancel = booking?.status === "PENDING";
  const showPayNow = Boolean(booking && canPayNow(booking));
  const showRetryHint =
    showPayNow &&
    (booking?.payment_status === "FAILED" || booking?.payment_status === "CANCELLED");

  return (
    <section data-testid="booking-detail-page" aria-labelledby="booking-detail-heading">
      <Link
        to="/app/customer/bookings"
        className="text-body-sm font-semibold"
        data-testid="booking-detail-back"
      >
        {messages.booking.backToHistory}
      </Link>

      <h1 id="booking-detail-heading" className="text-display-sm mt-3 mb-0">
        {messages.booking.detailTitle}
      </h1>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="booking-detail-loading"
        >
          {messages.booking.detailLoading}
        </p>
      ) : null}

      {!loading && notFound ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="booking-detail-not-found"
        >
          <h2 className="text-headline m-0">{messages.booking.detailNotFoundTitle}</h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.booking.detailNotFoundBody}
          </p>
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="mt-8" data-testid="booking-detail-error">
          <p
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {loadError}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
            onClick={load}
            data-testid="booking-detail-retry"
          >
            {messages.booking.retry}
          </button>
        </div>
      ) : null}

      {cancelSuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="booking-cancel-success"
        >
          {cancelSuccess}
        </p>
      ) : null}

      {cancelError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="booking-cancel-error"
        >
          {cancelError}
        </p>
      ) : null}

      {paySuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="booking-pay-success"
        >
          {paySuccess}
        </p>
      ) : null}

      {!loading && booking ? (
        <>
          <p className="mt-2 text-headline m-0" data-testid="booking-detail-package">
            {booking.package_title}
          </p>

          <div className="mt-6" aria-label={messages.booking.statusesTitle}>
            <BookingStatusChips booking={booking} testIdPrefix="booking-detail" />
          </div>

          <PaymentWindowCountdown booking={booking} testIdPrefix="booking-detail-countdown" />

          {!online && showPayNow ? <OfflinePayBanner testId="booking-detail-offline-banner" /> : null}

          <dl
            className="mt-8 m-0 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 sm:grid-cols-2"
            data-testid="booking-detail-summary"
          >
            <DetailRow
              label={messages.booking.referenceLabel}
              testId="booking-detail-reference"
            >
              <span className="font-semibold tracking-wide">{booking.reference}</span>
            </DetailRow>
            <DetailRow
              label={messages.booking.travelDateLabel}
              testId="booking-detail-tour-date"
            >
              {booking.tour_date}
            </DetailRow>
            <DetailRow
              label={messages.booking.travelersSummaryLabel}
              testId="booking-detail-travelers"
            >
              {booking.travelers}
            </DetailRow>
            <DetailRow
              label={messages.booking.submittedAtLabel}
              testId="booking-detail-submitted"
            >
              {formatSubmittedAt(booking.created_at)}
            </DetailRow>
            <DetailRow
              label={messages.booking.contactNameLabel}
              testId="booking-detail-contact-name"
            >
              {booking.contact_name}
            </DetailRow>
            <DetailRow
              label={messages.booking.contactEmailLabel}
              testId="booking-detail-contact-email"
            >
              {booking.contact_email}
            </DetailRow>
            <DetailRow
              label={messages.booking.contactPhoneLabel}
              testId="booking-detail-contact-phone"
            >
              {booking.contact_phone}
            </DetailRow>
            {booking.additional_requirements ? (
              <DetailRow
                label={messages.booking.requirementsHeading}
                testId="booking-detail-requirements"
              >
                {booking.additional_requirements}
              </DetailRow>
            ) : null}
            {booking.status === "REJECTED" ? (
              <DetailRow
                label={messages.booking.rejectionReasonLabel}
                testId="booking-detail-rejection-reason"
              >
                <span className="whitespace-pre-wrap break-words">
                  {booking.rejection_reason || messages.booking.statusNotAvailable}
                </span>
              </DetailRow>
            ) : null}
            {booking.payment_window_deadline_at ? (
              <DetailRow
                label={messages.booking.paymentDeadlineLabel}
                testId="booking-detail-payment-deadline"
              >
                {formatSubmittedAt(booking.payment_window_deadline_at)}
              </DetailRow>
            ) : null}
          </dl>

          {showRetryHint ? (
            <p
              className="mt-6 text-body-sm text-[var(--color-muted-foreground)]"
              data-testid="booking-retry-pay-hint"
            >
              {messages.booking.retryPayHint}
            </p>
          ) : null}

          {showPayNow ? (
            <div className="mt-8">
              {online ? (
                <Link
                  to={`/app/customer/bookings/${booking.id}/pay`}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
                  data-testid="booking-pay-now-link"
                >
                  {messages.booking.payNow}
                </Link>
              ) : (
                <span
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] opacity-50"
                  aria-disabled="true"
                  data-testid="booking-pay-now-link"
                >
                  {messages.booking.payNow}
                </span>
              )}
            </div>
          ) : null}

          {canCancel ? (
            <div className="mt-8">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-4 font-semibold text-[var(--color-destructive)] disabled:opacity-50"
                onClick={() => {
                  setCancelError("");
                  setCancelSuccess("");
                  setConfirmOpen(true);
                }}
                disabled={cancelling}
                data-testid="booking-cancel-button"
              >
                {cancelling ? messages.booking.cancelling : messages.booking.cancelBooking}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen && Boolean(booking)}
        role="alertdialog"
        title={messages.booking.cancelDialogTitle}
        body={messages.booking.cancelDialogBody.replace(
          "{reference}",
          booking?.reference || "",
        )}
        confirmLabel={messages.booking.cancelDialogConfirm}
        cancelLabel={messages.booking.cancelDialogKeep}
        onConfirm={handleCancelConfirm}
        onCancel={closeConfirm}
      />
    </section>
  );
}
