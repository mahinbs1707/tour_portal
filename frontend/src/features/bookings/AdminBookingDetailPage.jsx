import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { BookingStatusChips } from "./BookingStatusChips.jsx";
import { getAdminBooking } from "./adminBookingsApi.js";
import { formatSubmittedAt } from "./bookingFormat.js";

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
 * Admin booking detail (Story 6.1) — read-only. No approve / reject /
 * payment-window / Pay / Cancel controls; those arrive in Stories 6.2–6.4.
 */
export function AdminBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const generationRef = useRef(0);

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
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

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
        </>
      ) : null}
    </section>
  );
}
