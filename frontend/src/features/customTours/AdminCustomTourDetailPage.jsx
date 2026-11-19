import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { ConfirmDialog } from "../packages/ConfirmDialog.jsx";
import { formatSubmittedAt } from "../bookings/bookingFormat.js";
import {
  approveAdminCustomTour,
  getAdminCustomTour,
  rejectAdminCustomTour,
} from "./adminCustomToursApi.js";
import { CustomTourStatusChip } from "./CustomTourStatusChip.jsx";
import { formatCustomTourDateRange } from "./customTourFormat.js";

const REJECTION_REASON_MAX = 2000;
const ADJUSTMENTS_MAX = 2000;

function DetailRow({ label, children }) {
  return (
    <div>
      <dt className="text-label text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="m-0 mt-1 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

export function AdminCustomTourDetailPage() {
  const { id } = useParams();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAdjustments, setRejectAdjustments] = useState("");
  const [reapplyEnabled, setReapplyEnabled] = useState(false);
  const [rejectFieldError, setRejectFieldError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const generationRef = useRef(0);
  const approvingRef = useRef(false);
  const rejectingRef = useRef(false);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setNotFound(false);
    setLoadError("");
    try {
      const data = await getAdminCustomTour(id);
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
        setLoadError(messages.adminCustomTours.errors.detailGeneric);
      }
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    setApproveOpen(false);
    setRejectOpen(false);
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  async function handleApprove() {
    if (approvingRef.current || !tour) {
      return;
    }
    approvingRef.current = true;
    setApproving(true);
    setApproveError("");
    try {
      const updated = await approveAdminCustomTour(tour.id);
      setTour(updated);
      setApproveOpen(false);
    } catch (err) {
      setApproveOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        setApproveError(messages.adminCustomTours.errors.approveNotPending);
        load();
      } else if (err instanceof ApiError && err.status === 400) {
        const msg =
          err.nonFieldErrors?.[0] ||
          err.fieldErrors?.detail?.[0] ||
          messages.adminCustomTours.errors.approveBlocked;
        setApproveError(msg);
      } else {
        setApproveError(messages.adminCustomTours.errors.approveGeneric);
        load();
      }
    } finally {
      approvingRef.current = false;
      setApproving(false);
    }
  }

  async function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectFieldError(messages.adminCustomTours.errors.rejectReasonRequired);
      return;
    }
    if (reason.length > REJECTION_REASON_MAX) {
      setRejectFieldError(
        messages.adminCustomTours.errors.rejectReasonTooLong.replace(
          "{max}",
          String(REJECTION_REASON_MAX),
        ),
      );
      return;
    }
    if (rejectAdjustments.trim().length > ADJUSTMENTS_MAX) {
      setRejectFieldError(messages.adminCustomTours.errors.adjustmentsTooLong);
      return;
    }
    if (rejectingRef.current || !tour) {
      return;
    }
    rejectingRef.current = true;
    setRejecting(true);
    setRejectError("");
    setRejectFieldError("");
    try {
      const updated = await rejectAdminCustomTour(tour.id, {
        rejection_reason: reason,
        recommended_adjustments: rejectAdjustments.trim(),
        reapply_enabled: reapplyEnabled,
      });
      setTour(updated);
      setRejectOpen(false);
    } catch (err) {
      setRejectOpen(false);
      if (err instanceof ApiError && err.status === 409) {
        setRejectError(messages.adminCustomTours.errors.rejectNotPending);
        load();
      } else if (err instanceof ApiError && err.status === 400) {
        setRejectFieldError(
          err.fieldErrors?.rejection_reason?.[0] ||
            messages.adminCustomTours.errors.rejectGeneric,
        );
        setRejectOpen(true);
      } else {
        setRejectError(messages.adminCustomTours.errors.rejectGeneric);
        load();
      }
    } finally {
      rejectingRef.current = false;
      setRejecting(false);
    }
  }

  if (loading) {
    return <p aria-busy="true">{messages.adminCustomTours.detailLoading}</p>;
  }
  if (notFound) {
    return (
      <section>
        <h1 className="text-display-sm m-0">{messages.adminCustomTours.detailNotFoundTitle}</h1>
        <Link to="/app/admin/custom-tours" className="mt-4 inline-block font-semibold">
          {messages.adminCustomTours.backToList}
        </Link>
      </section>
    );
  }
  if (loadError) {
    return (
      <p className="text-[var(--color-destructive)]" role="alert">
        {loadError}
      </p>
    );
  }
  if (!tour) {
    return null;
  }

  const isPending = tour.status === "PENDING";

  return (
    <section data-testid="admin-custom-tour-detail">
      <Link to="/app/admin/custom-tours" className="font-semibold">
        {messages.adminCustomTours.backToList}
      </Link>
      <h1 className="text-display-sm m-0 mt-4">{messages.adminCustomTours.detailTitle}</h1>
      <p className="mt-2 text-headline m-0">{tour.title}</p>
      <div className="mt-3">
        <CustomTourStatusChip status={tour.status} testId="admin-custom-tour-status" />
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <DetailRow label={messages.adminCustomTours.customerNameLabel}>
          {tour.customer_full_name}
        </DetailRow>
        <DetailRow label={messages.adminCustomTours.customerEmailLabel}>
          {tour.customer_email}
        </DetailRow>
        <DetailRow label={messages.customTour.destinationLabel}>{tour.destination}</DetailRow>
        <DetailRow label={messages.customTour.datesLabel}>
          {formatCustomTourDateRange(tour.start_date, tour.end_date)}
        </DetailRow>
        <DetailRow label={messages.customTour.travelersLabel}>{tour.travelers}</DetailRow>
        <DetailRow label={messages.customTour.budgetLabel}>
          {tour.estimated_budget} {tour.currency}
        </DetailRow>
        <DetailRow label={messages.customTour.submittedAtLabel}>
          {formatSubmittedAt(tour.created_at)}
        </DetailRow>
      </dl>

      {tour.rejection_reason ? (
        <p className="mt-6 rounded-[var(--radius-md)] border px-4 py-3">
          <strong>{messages.customTour.rejectionTitle}:</strong> {tour.rejection_reason}
        </p>
      ) : null}

      {isPending ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]"
            onClick={() => setApproveOpen(true)}
            data-testid="admin-custom-tour-approve"
          >
            {messages.adminCustomTours.approveTour}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-md)] border px-4 font-semibold"
            onClick={() => {
              setRejectReason("");
              setRejectAdjustments("");
              setReapplyEnabled(false);
              setRejectFieldError("");
              setRejectError("");
              setRejectOpen(true);
            }}
            data-testid="admin-custom-tour-reject"
          >
            {messages.adminCustomTours.rejectTour}
          </button>
        </div>
      ) : null}

      {approveError ? (
        <p className="mt-4 text-[var(--color-destructive)]" role="alert">
          {approveError}
        </p>
      ) : null}
      {rejectError ? (
        <p className="mt-4 text-[var(--color-destructive)]" role="alert">
          {rejectError}
        </p>
      ) : null}

      <ConfirmDialog
        open={approveOpen}
        title={messages.adminCustomTours.approveDialogTitle}
        body={messages.adminCustomTours.approveDialogBody.replace("{title}", tour.title)}
        confirmLabel={
          approving
            ? messages.adminCustomTours.approving
            : messages.adminCustomTours.approveDialogConfirm
        }
        cancelLabel={messages.adminCustomTours.approveDialogKeep}
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
        confirmDisabled={approving}
      />

      <ConfirmDialog
        open={rejectOpen}
        title={messages.adminCustomTours.rejectDialogTitle}
        body={messages.adminCustomTours.rejectDialogBody.replace("{title}", tour.title)}
        confirmLabel={
          rejecting
            ? messages.adminCustomTours.rejecting
            : messages.adminCustomTours.rejectDialogConfirm
        }
        cancelLabel={messages.adminCustomTours.rejectDialogKeep}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        confirmDisabled={rejecting}
        role="alertdialog"
      >
        <label className="mt-4 block text-label" htmlFor="admin-ct-reject-reason">
          {messages.adminCustomTours.rejectReasonLabel}
          <textarea
            id="admin-ct-reject-reason"
            className="mt-1 w-full min-h-24 rounded-[var(--radius-md)] border px-3 py-2"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={REJECTION_REASON_MAX}
          />
        </label>
        <label className="mt-3 block text-label" htmlFor="admin-ct-adjustments">
          {messages.adminCustomTours.adjustmentsLabel}
          <textarea
            id="admin-ct-adjustments"
            className="mt-1 w-full min-h-20 rounded-[var(--radius-md)] border px-3 py-2"
            value={rejectAdjustments}
            onChange={(e) => setRejectAdjustments(e.target.value)}
            maxLength={ADJUSTMENTS_MAX}
          />
        </label>
        <label className="mt-3 flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={reapplyEnabled}
            onChange={(e) => setReapplyEnabled(e.target.checked)}
          />
          {messages.adminCustomTours.reapplyEnabledLabel}
        </label>
        {rejectFieldError ? (
          <p className="mt-2 text-[var(--color-destructive)]" role="alert">
            {rejectFieldError}
          </p>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}