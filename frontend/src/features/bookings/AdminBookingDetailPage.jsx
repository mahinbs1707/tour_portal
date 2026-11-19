import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { ConfirmDialog } from "../packages/ConfirmDialog.jsx";
import {
  approveAdminBooking,
  extendAdminPaymentWindow,
  getAdminBooking,
  reopenAdminPaymentWindow,
  rejectAdminBooking,
} from "./adminBookingsApi.js";
import { deadlineLocalToIso, formatSubmittedAt } from "./bookingFormat.js";

/** Matches the backend cap (same as booking additional_requirements). */
const REJECTION_REASON_MAX_LENGTH = 2000;

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

/** Blank values show a placeholder instead of an empty cell. */
function orPlaceholder(value) {
  return value ? value : messages.booking.statusNotAvailable;
}

const sectionClass =
  "mt-8 m-0 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 sm:grid-cols-2";

/**
 * Admin booking detail. Story 6.1: read-only detail. Story 6.2: Approve (only
 * while PENDING) behind a confirm dialog with fixed 24h-window copy; after
 * success the page stays here and shows the refreshed statuses. Story 6.3:
 * Reject (only while PENDING) in an alertdialog with a required reason; after
 * success the page stays here, shows the persisted reason, and the decision
 * controls disappear. Story 6.4: reopen (EXPIRED only) and extend (future
 * deadline) on approved bookings; stay on detail after success. Pay stays hidden.
 */
export function AdminBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approveSuccess, setApproveSuccess] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectFieldError, setRejectFieldError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [rejectSuccess, setRejectSuccess] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState("");
  const [reopenSuccess, setReopenSuccess] = useState("");
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDeadlineLocal, setExtendDeadlineLocal] = useState("");
  const [extendFieldError, setExtendFieldError] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");
  const [extendSuccess, setExtendSuccess] = useState("");
  const generationRef = useRef(0);
  const approvingRef = useRef(false);
  const rejectingRef = useRef(false);
  const reopeningRef = useRef(false);
  const extendingRef = useRef(false);
  const reasonInputRef = useRef(null);
  const extendInputRef = useRef(null);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setBooking(null);
    setLoading(true);
    setNotFound(false);
    setLoadError("");
    try {
      const data = await getAdminBooking(id);
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
        setLoadError(messages.adminBookings.errors.detailGeneric);
      }
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    // New :id — drop approve UI state from the previous booking.
    setConfirmOpen(false);
    setApproveError("");
    setApproveSuccess("");
    setRejectOpen(false);
    setRejectReason("");
    setRejectFieldError("");
    setRejectError("");
    setRejectSuccess("");
    setReopenOpen(false);
    setReopenError("");
    setReopenSuccess("");
    setExtendOpen(false);
    setExtendDeadlineLocal("");
    setExtendFieldError("");
    setExtendError("");
    setExtendSuccess("");
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const closeReject = useCallback(() => {
    setRejectOpen(false);
    setRejectFieldError("");
  }, []);
  const closeReopen = useCallback(() => setReopenOpen(false), []);
  const closeExtend = useCallback(() => {
    setExtendOpen(false);
    setExtendFieldError("");
  }, []);

  function openReject() {
    setApproveError("");
    setApproveSuccess("");
    setRejectError("");
    setRejectSuccess("");
    setRejectReason("");
    setRejectFieldError("");
    setRejectOpen(true);
  }

  async function handleRejectConfirm() {
    if (rejectingRef.current || !booking) {
      return;
    }
    const errors = messages.adminBookings.errors;
    const reason = rejectReason.trim();
    // Blocked client-side: nothing is sent for a blank or too-long reason.
    if (!reason) {
      setRejectFieldError(errors.rejectReasonRequired);
      reasonInputRef.current?.focus();
      return;
    }
    if (reason.length > REJECTION_REASON_MAX_LENGTH) {
      setRejectFieldError(
        errors.rejectReasonTooLong.replace("{max}", String(REJECTION_REASON_MAX_LENGTH)),
      );
      reasonInputRef.current?.focus();
      return;
    }
    const generation = generationRef.current;
    rejectingRef.current = true;
    setRejecting(true);
    setRejectFieldError("");
    setRejectError("");
    setRejectSuccess("");
    try {
      const updated = await rejectAdminBooking(booking.id, reason);
      if (generation !== generationRef.current) {
        return;
      }
      // 1A: stay on detail; live status + persisted reason; controls disappear.
      setBooking(updated);
      setRejectSuccess(
        messages.adminBookings.rejectSuccess.replace("{reference}", updated.reference),
      );
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors.rejection_reason) {
        // Server-side reason validation: keep the dialog open on the field.
        setRejectFieldError(err.fieldErrors.rejection_reason[0]);
        return;
      }
      setRejectOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        setRejectError(errors.rejectNotPending);
        // Booking changed underneath us — refresh live status (Reject disappears).
        load();
      } else if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
        setNotFound(true);
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setRejectError(errors.rejectGeneric);
      } else {
        // Network/timeout/5xx: the rejection may or may not have been applied.
        setRejectError(errors.rejectOutcomeUnknown);
        load();
      }
    } finally {
      rejectingRef.current = false;
      setRejecting(false);
    }
  }

  async function handleApproveConfirm() {
    if (approvingRef.current || !booking) {
      return;
    }
    const generation = generationRef.current;
    approvingRef.current = true;
    setApproving(true);
    setApproveError("");
    setApproveSuccess("");
    setRejectError("");
    setRejectSuccess("");
    try {
      const updated = await approveAdminBooking(booking.id);
      if (generation !== generationRef.current) {
        return;
      }
      // 1A: stay on detail; live booking / payment / window statuses.
      setBooking(updated);
      setApproveSuccess(
        messages.adminBookings.approveSuccess.replace(
          "{reference}",
          updated.reference,
        ),
      );
      setConfirmOpen(false);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setConfirmOpen(false);
      const errors = messages.adminBookings.errors;
      if (err instanceof ApiError && err.status === 409) {
        setApproveError(errors.approveNotPending);
        // Booking changed underneath us — refresh live status (Approve disappears).
        load();
      } else if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
        setNotFound(true);
      } else if (err instanceof ApiError && err.status === 400) {
        // e.g. the 7-day rule no longer holds; nothing changed server-side.
        const reason = err.nonFieldErrors[0] || "";
        setApproveError(
          reason
            ? errors.approveBlocked.replace("{reason}", reason)
            : errors.approveGeneric,
        );
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setApproveError(errors.approveGeneric);
      } else {
        // Network/timeout/5xx: the approval may or may not have been applied.
        setApproveError(errors.approveOutcomeUnknown);
        load();
      }
    } finally {
      approvingRef.current = false;
      setApproving(false);
    }
  }

  async function handleReopenConfirm() {
    if (reopeningRef.current || !booking) {
      return;
    }
    const generation = generationRef.current;
    reopeningRef.current = true;
    setReopening(true);
    setReopenError("");
    setReopenSuccess("");
    setExtendError("");
    setExtendSuccess("");
    try {
      const updated = await reopenAdminPaymentWindow(booking.id);
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(updated);
      setReopenSuccess(
        messages.adminBookings.reopenSuccess.replace(
          "{reference}",
          updated.reference,
        ),
      );
      setReopenOpen(false);
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      setReopenOpen(false);
      const errors = messages.adminBookings.errors;
      if (err instanceof ApiError && err.status === 409) {
        setReopenError(errors.reopenNotExpired);
        load();
      } else if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
        setNotFound(true);
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setReopenError(errors.reopenGeneric);
      } else {
        setReopenError(errors.reopenOutcomeUnknown);
        load();
      }
    } finally {
      reopeningRef.current = false;
      setReopening(false);
    }
  }

  async function handleExtendConfirm() {
    if (extendingRef.current || !booking) {
      return;
    }
    const errors = messages.adminBookings.errors;
    if (!extendDeadlineLocal.trim()) {
      setExtendFieldError(errors.extendDeadlineRequired);
      extendInputRef.current?.focus();
      return;
    }
    const generation = generationRef.current;
    extendingRef.current = true;
    setExtending(true);
    setExtendFieldError("");
    setExtendError("");
    setExtendSuccess("");
    setReopenError("");
    setReopenSuccess("");
    try {
      const updated = await extendAdminPaymentWindow(
        booking.id,
        deadlineLocalToIso(extendDeadlineLocal),
      );
      if (generation !== generationRef.current) {
        return;
      }
      setBooking(updated);
      setExtendSuccess(
        messages.adminBookings.extendSuccess.replace(
          "{reference}",
          updated.reference,
        ),
      );
      setExtendOpen(false);
      setExtendDeadlineLocal("");
    } catch (err) {
      if (generation !== generationRef.current) {
        return;
      }
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors.deadline_at) {
        setExtendFieldError(err.fieldErrors.deadline_at[0]);
        return;
      }
      setExtendOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        setExtendError(errors.extendNotAllowed);
        load();
      } else if (err instanceof ApiError && err.status === 404) {
        setBooking(null);
        setNotFound(true);
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setExtendError(errors.extendGeneric);
      } else {
        setExtendError(errors.extendOutcomeUnknown);
        load();
      }
    } finally {
      extendingRef.current = false;
      setExtending(false);
    }
  }

  const canApprove = booking?.status === "PENDING";
  const canReopen =
    booking?.status === "APPROVED" && booking?.payment_window_status === "EXPIRED";
  const canExtend =
    booking?.status === "APPROVED" && booking?.payment_window_status !== "NOT_OPEN";
  const windowBusy = approving || rejecting || reopening || extending;

  return (
    <section
      data-testid="admin-booking-detail-page"
      aria-labelledby="admin-booking-detail-heading"
    >
      <Link
        to="/app/admin/bookings"
        className="text-body-sm font-semibold"
        data-testid="admin-booking-detail-back"
      >
        {messages.adminBookings.backToList}
      </Link>

      <h1 id="admin-booking-detail-heading" className="text-display-sm mt-3 mb-0">
        {messages.adminBookings.detailTitle}
      </h1>

      {loading ? (
        <p
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="admin-booking-detail-loading"
        >
          {messages.adminBookings.detailLoading}
        </p>
      ) : null}

      {!loading && notFound ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          data-testid="admin-booking-detail-not-found"
        >
          <h2 className="text-headline m-0">
            {messages.adminBookings.detailNotFoundTitle}
          </h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.adminBookings.detailNotFoundBody}
          </p>
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="mt-8" data-testid="admin-booking-detail-error">
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
            data-testid="admin-booking-detail-retry"
          >
            {messages.booking.retry}
          </button>
        </div>
      ) : null}

      {approveSuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="admin-booking-approve-success"
        >
          {approveSuccess}
        </p>
      ) : null}

      {approveError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="admin-booking-approve-error"
        >
          {approveError}
        </p>
      ) : null}

      {rejectSuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="admin-booking-reject-success"
        >
          {rejectSuccess}
        </p>
      ) : null}

      {rejectError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="admin-booking-reject-error"
        >
          {rejectError}
        </p>
      ) : null}

      {reopenSuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="admin-booking-reopen-success"
        >
          {reopenSuccess}
        </p>
      ) : null}

      {reopenError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="admin-booking-reopen-error"
        >
          {reopenError}
        </p>
      ) : null}

      {extendSuccess ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="admin-booking-extend-success"
        >
          {extendSuccess}
        </p>
      ) : null}

      {extendError ? (
        <p
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="admin-booking-extend-error"
        >
          {extendError}
        </p>
      ) : null}

      {!loading && booking ? (
        <>
          <p
            className="mt-2 text-headline m-0"
            data-testid="admin-booking-detail-package"
          >
            {booking.package_title}
          </p>

          <div className="mt-6" aria-label={messages.adminBookings.statusesTitle}>
            <BookingStatusChips
              booking={booking}
              testIdPrefix="admin-booking-detail"
            />
          </div>

          <dl className={sectionClass} data-testid="admin-booking-detail-summary">
            <DetailRow
              label={messages.booking.referenceLabel}
              testId="admin-booking-detail-reference"
            >
              <span className="font-semibold tracking-wide">{booking.reference}</span>
            </DetailRow>
            <DetailRow
              label={messages.booking.travelDateLabel}
              testId="admin-booking-detail-tour-date"
            >
              {booking.tour_date}
            </DetailRow>
            <DetailRow
              label={messages.booking.travelersSummaryLabel}
              testId="admin-booking-detail-travelers"
            >
              {booking.travelers}
            </DetailRow>
            <DetailRow
              label={messages.booking.submittedAtLabel}
              testId="admin-booking-detail-submitted"
            >
              {formatSubmittedAt(booking.created_at)}
            </DetailRow>
            <DetailRow
              label={messages.booking.requirementsHeading}
              testId="admin-booking-detail-requirements"
            >
              {orPlaceholder(booking.additional_requirements)}
            </DetailRow>
            {booking.status === "REJECTED" ? (
              <DetailRow
                label={messages.adminBookings.rejectionReasonLabel}
                testId="admin-booking-detail-rejection-reason"
              >
                <span className="whitespace-pre-wrap break-words">
                  {orPlaceholder(booking.rejection_reason)}
                </span>
              </DetailRow>
            ) : null}
            {booking.payment_window_deadline_at ? (
              <DetailRow
                label={messages.adminBookings.paymentDeadlineLabel}
                testId="admin-booking-detail-payment-deadline"
              >
                {formatSubmittedAt(booking.payment_window_deadline_at)}
              </DetailRow>
            ) : null}
            {booking.status === "APPROVED" ? (
              <DetailRow
                label={messages.adminBookings.paymentEligibleLabel}
                testId="admin-booking-detail-payment-eligible"
              >
                {booking.payment_eligible
                  ? messages.adminBookings.paymentEligibleYes
                  : messages.adminBookings.paymentEligibleNo}
              </DetailRow>
            ) : null}
          </dl>

          <h2 className="text-headline mt-8 mb-0">
            {messages.adminBookings.customerSectionTitle}
          </h2>
          <dl
            className={`${sectionClass} !mt-3`}
            data-testid="admin-booking-detail-customer"
          >
            <DetailRow
              label={messages.adminBookings.customerNameLabel}
              testId="admin-booking-detail-customer-name"
            >
              {orPlaceholder(booking.customer_full_name)}
            </DetailRow>
            <DetailRow
              label={messages.adminBookings.customerEmailLabel}
              testId="admin-booking-detail-customer-email"
            >
              {orPlaceholder(booking.customer_email)}
            </DetailRow>
          </dl>

          <h2 className="text-headline mt-8 mb-0">
            {messages.adminBookings.contactSectionTitle}
          </h2>
          <dl
            className={`${sectionClass} !mt-3`}
            data-testid="admin-booking-detail-contact"
          >
            <DetailRow
              label={messages.booking.contactNameLabel}
              testId="admin-booking-detail-contact-name"
            >
              {orPlaceholder(booking.contact_name)}
            </DetailRow>
            <DetailRow
              label={messages.booking.contactEmailLabel}
              testId="admin-booking-detail-contact-email"
            >
              {orPlaceholder(booking.contact_email)}
            </DetailRow>
            <DetailRow
              label={messages.booking.contactPhoneLabel}
              testId="admin-booking-detail-contact-phone"
            >
              {orPlaceholder(booking.contact_phone)}
            </DetailRow>
          </dl>

          {canApprove ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                onClick={() => {
                  setApproveError("");
                  setApproveSuccess("");
                  setRejectError("");
                  setRejectSuccess("");
                  setConfirmOpen(true);
                }}
                disabled={windowBusy}
                data-testid="admin-booking-approve-button"
              >
                {approving
                  ? messages.adminBookings.approving
                  : messages.adminBookings.approveBooking}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-4 font-semibold text-[var(--color-destructive)] disabled:opacity-50"
                onClick={openReject}
                disabled={windowBusy}
                data-testid="admin-booking-reject-button"
              >
                {rejecting
                  ? messages.adminBookings.rejecting
                  : messages.adminBookings.rejectBooking}
              </button>
            </div>
          ) : null}

          {canReopen || canExtend ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {canReopen ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
                  onClick={() => {
                    setReopenError("");
                    setReopenSuccess("");
                    setExtendError("");
                    setExtendSuccess("");
                    setReopenOpen(true);
                  }}
                  disabled={windowBusy}
                  data-testid="admin-booking-reopen-button"
                >
                  {reopening
                    ? messages.adminBookings.reopening
                    : messages.adminBookings.reopenWindow}
                </button>
              ) : null}
              {canExtend ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  onClick={() => {
                    setExtendError("");
                    setExtendSuccess("");
                    setReopenError("");
                    setReopenSuccess("");
                    setExtendDeadlineLocal("");
                    setExtendFieldError("");
                    setExtendOpen(true);
                  }}
                  disabled={windowBusy}
                  data-testid="admin-booking-extend-button"
                >
                  {extending
                    ? messages.adminBookings.extending
                    : messages.adminBookings.extendWindow}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen && canApprove}
        title={messages.adminBookings.approveDialogTitle}
        body={messages.adminBookings.approveDialogBody.replace(
          "{reference}",
          booking?.reference || "",
        )}
        confirmLabel={messages.adminBookings.approveDialogConfirm}
        cancelLabel={messages.adminBookings.approveDialogKeep}
        onConfirm={handleApproveConfirm}
        onCancel={closeConfirm}
      />

      <ConfirmDialog
        open={rejectOpen && canApprove}
        role="alertdialog"
        title={messages.adminBookings.rejectDialogTitle}
        body={messages.adminBookings.rejectDialogBody.replace(
          "{reference}",
          booking?.reference || "",
        )}
        confirmLabel={messages.adminBookings.rejectDialogConfirm}
        cancelLabel={messages.adminBookings.rejectDialogKeep}
        onConfirm={handleRejectConfirm}
        onCancel={closeReject}
        initialFocusRef={reasonInputRef}
      >
        <div className="mt-4">
          <label
            htmlFor="admin-booking-reject-reason"
            className="text-label text-[var(--color-muted-foreground)]"
          >
            {messages.adminBookings.rejectReasonLabel}
          </label>
          <textarea
            id="admin-booking-reject-reason"
            ref={reasonInputRef}
            className="mt-1 block min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)]"
            value={rejectReason}
            maxLength={REJECTION_REASON_MAX_LENGTH}
            required
            aria-required="true"
            aria-invalid={rejectFieldError ? "true" : "false"}
            aria-describedby={
              rejectFieldError
                ? "admin-booking-reject-reason-hint admin-booking-reject-reason-error"
                : "admin-booking-reject-reason-hint"
            }
            disabled={rejecting}
            onChange={(event) => {
              setRejectReason(event.target.value);
              if (rejectFieldError) {
                setRejectFieldError("");
              }
            }}
            data-testid="admin-booking-reject-reason"
          />
          <p
            id="admin-booking-reject-reason-hint"
            className="mt-1 mb-0 text-body-sm text-[var(--color-muted-foreground)]"
          >
            {messages.adminBookings.rejectReasonHint.replace(
              "{max}",
              String(REJECTION_REASON_MAX_LENGTH),
            )}
          </p>
          {rejectFieldError ? (
            <p
              id="admin-booking-reject-reason-error"
              className="mt-1 mb-0 text-body-sm text-[var(--color-destructive)]"
              role="alert"
              data-testid="admin-booking-reject-reason-error"
            >
              {rejectFieldError}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={reopenOpen && canReopen}
        title={messages.adminBookings.reopenDialogTitle}
        body={messages.adminBookings.reopenDialogBody.replace(
          "{reference}",
          booking?.reference || "",
        )}
        confirmLabel={messages.adminBookings.reopenDialogConfirm}
        cancelLabel={messages.adminBookings.reopenDialogKeep}
        onConfirm={handleReopenConfirm}
        onCancel={closeReopen}
      />

      <ConfirmDialog
        open={extendOpen && canExtend}
        role="alertdialog"
        title={messages.adminBookings.extendDialogTitle}
        body={messages.adminBookings.extendDialogBody.replace(
          "{reference}",
          booking?.reference || "",
        )}
        confirmLabel={messages.adminBookings.extendDialogConfirm}
        cancelLabel={messages.adminBookings.extendDialogKeep}
        onConfirm={handleExtendConfirm}
        onCancel={closeExtend}
        initialFocusRef={extendInputRef}
      >
        <div className="mt-4">
          <label
            htmlFor="admin-booking-extend-deadline"
            className="text-label text-[var(--color-muted-foreground)]"
          >
            {messages.adminBookings.extendDeadlineLabel}
          </label>
          <input
            id="admin-booking-extend-deadline"
            ref={extendInputRef}
            type="datetime-local"
            className="mt-1 block min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)]"
            value={extendDeadlineLocal}
            required
            aria-required="true"
            aria-invalid={extendFieldError ? "true" : "false"}
            aria-describedby={
              extendFieldError
                ? "admin-booking-extend-deadline-error"
                : undefined
            }
            disabled={extending}
            onChange={(event) => {
              setExtendDeadlineLocal(event.target.value);
              if (extendFieldError) {
                setExtendFieldError("");
              }
            }}
            data-testid="admin-booking-extend-deadline"
          />
          {extendFieldError ? (
            <p
              id="admin-booking-extend-deadline-error"
              className="mt-1 mb-0 text-body-sm text-[var(--color-destructive)]"
              role="alert"
              data-testid="admin-booking-extend-deadline-error"
            >
              {extendFieldError}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
