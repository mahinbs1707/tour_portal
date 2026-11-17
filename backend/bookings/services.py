"""BookingService — catalog booking create (AD-16 / AD-17 / AD-20)."""

from __future__ import annotations

import uuid
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from audit.services import AuditService
from notifications.services import NotificationService
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import assert_bookable_date
from payments.services import (
    PaymentService,
    PaymentWindowMissing,
    PaymentWindowNotOpenable,
)

from bookings.models import Booking, BookingStatus

REFERENCE_HEX_LEN = 12
MAX_REFERENCE_RETRIES = 5
BOOKING_ENTITY_TYPE = "booking"
BOOKING_SUBMITTED_EVENT = "booking.submitted"
BOOKING_CANCELLED_EVENT = "booking.cancelled"
BOOKING_APPROVED_EVENT = "booking.approved"
BOOKING_APPROVE_AUDIT_ACTION = "booking.approve"
BOOKING_REJECTED_EVENT = "booking.rejected"
BOOKING_REJECT_AUDIT_ACTION = "booking.reject"
# Same cap as ``additional_requirements`` (Story 6.3, decision 2A).
REJECTION_REASON_MAX_LENGTH = 2000


class BookingNotCancellable(Exception):
    """Raised when a Customer tries to cancel a booking that is not PENDING."""


class BookingNotRejectable(Exception):
    """Raised when an Admin tries to reject a booking that is not PENDING."""


class BookingNotApprovable(Exception):
    """Raised when an Admin tries to approve a booking that cannot be approved."""


def reference_from_uuid(value: uuid.UUID) -> str:
    """Opaque 12-char uppercase hex display/lookup code from a booking UUID."""
    return value.hex[:REFERENCE_HEX_LEN].upper()


class BookingService:
    """Creates PENDING bookings with NOT_OPEN window + booking.submitted notif."""

    def __init__(
        self,
        *,
        payments: PaymentService | None = None,
        notifications: NotificationService | None = None,
        audit: AuditService | None = None,
    ):
        self.payments = payments or PaymentService()
        self.notifications = notifications or NotificationService()
        self.audit = audit or AuditService()

    def create(
        self,
        *,
        customer,
        package_id,
        available_date_id,
        travelers: int,
        contact_name: str,
        contact_email: str,
        contact_phone: str,
        additional_requirements: str = "",
    ) -> Booking:
        package = self._require_published_package(package_id)
        available_date = self._require_active_date(package, available_date_id)
        try:
            assert_bookable_date(available_date.tour_date)
        except ValueError as exc:
            raise ValidationError({"available_date_id": [str(exc)]}) from exc

        if travelers < 1:
            raise ValidationError({"travelers": ["Enter at least 1 traveler."]})

        payload = {
            "package_id": package.id,
            "available_date_id": available_date.id,
            "travelers": travelers,
            "contact_name": contact_name.strip(),
            "contact_email": contact_email.strip(),
            "contact_phone": contact_phone.strip(),
            "additional_requirements": (additional_requirements or "").strip(),
        }

        with transaction.atomic():
            booking = self._create_booking_row(customer=customer, package=package, available_date=available_date, payload=payload)
            self.payments.create_not_open_for_booking(booking)
            notification = self.notifications.create(
                recipient_id=customer.id,
                event_key=BOOKING_SUBMITTED_EVENT,
                entity_type=BOOKING_ENTITY_TYPE,
                entity_id=booking.id,
                payload={
                    "reference": booking.reference,
                    "booking_id": str(booking.id),
                    "status": booking.status,
                },
            )
            if notification is None:
                raise RuntimeError(
                    "booking.submitted notification was not created."
                )
            return booking

    def cancel(self, *, customer, booking_id) -> Booking:
        """Cancel an owned PENDING booking and emit ``booking.cancelled``.

        Ownership is enforced by the lookup (``Booking.DoesNotExist`` for a
        missing or foreign booking). Status flip and notification share one
        atomic block. Never touches ``PaymentWindow`` (AD-16).
        """
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(
                pk=booking_id, customer=customer
            )
            if booking.status != BookingStatus.PENDING:
                raise BookingNotCancellable(
                    "Only pending bookings can be cancelled."
                )
            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])
            notification = self.notifications.create(
                recipient_id=customer.id,
                event_key=BOOKING_CANCELLED_EVENT,
                entity_type=BOOKING_ENTITY_TYPE,
                entity_id=booking.id,
                payload={
                    "reference": booking.reference,
                    "booking_id": str(booking.id),
                    "status": booking.status,
                },
            )
            if notification is None:
                raise RuntimeError(
                    "booking.cancelled notification was not created."
                )
            return booking

    def approve(self, *, admin, booking_id) -> Booking:
        """Approve a PENDING booking and open its payment window (Story 6.2).

        One atomic block: booking → ``APPROVED`` (+ ``approved_at``), the same
        ``NOT_OPEN`` window → ``OPEN`` via ``PaymentService`` (deadline =
        approval + 24h), ``booking.approve`` audit, ``booking.approved``
        notification. Any failure rolls everything back.

        Raises ``Booking.DoesNotExist`` (unknown id), ``BookingNotApprovable``
        (not PENDING / window not openable) or Django ``ValidationError``
        (7-day rule fails at approve time, or the window row is missing).
        """
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status != BookingStatus.PENDING:
                raise BookingNotApprovable("Only pending bookings can be approved.")
            try:
                assert_bookable_date(booking.available_date.tour_date)
            except ValueError as exc:
                raise ValidationError({"detail": [str(exc)]}) from exc

            before = self._decision_snapshot(booking)
            approved_at = timezone.now()
            booking.status = BookingStatus.APPROVED
            booking.approved_at = approved_at
            booking.save(update_fields=["status", "approved_at", "updated_at"])
            try:
                window = self.payments.open_window_for_booking(
                    booking, opened_at=approved_at
                )
            except PaymentWindowMissing as exc:
                raise ValidationError({"detail": [str(exc)]}) from exc
            except PaymentWindowNotOpenable as exc:
                raise BookingNotApprovable(str(exc)) from exc

            self.audit.record(
                actor_id=admin.id,
                action=BOOKING_APPROVE_AUDIT_ACTION,
                target_type=BOOKING_ENTITY_TYPE,
                target_id=str(booking.id),
                before=before,
                after=self._decision_snapshot(booking, window=window),
            )
            notification = self.notifications.create(
                recipient_id=booking.customer_id,
                event_key=BOOKING_APPROVED_EVENT,
                entity_type=BOOKING_ENTITY_TYPE,
                entity_id=booking.id,
                payload={
                    "reference": booking.reference,
                    "booking_id": str(booking.id),
                    "status": booking.status,
                    "payment_window_deadline_at": window.deadline_at.isoformat(),
                },
            )
            if notification is None:
                raise RuntimeError("booking.approved notification was not created.")
            return booking

    def reject(self, *, admin, booking_id, reason: str) -> Booking:
        """Reject a PENDING booking with a mandatory reason (Story 6.3).

        One atomic block: booking → ``REJECTED`` + trimmed ``rejection_reason``,
        ``booking.reject`` audit, ``booking.rejected`` notification (reason in
        payload). The existing ``NOT_OPEN`` payment window is left untouched —
        never opened, never written from here (AD-16). Any failure rolls back.

        Raises Django ``ValidationError`` (blank / too-long reason),
        ``Booking.DoesNotExist`` (unknown id) or ``BookingNotRejectable``
        (not PENDING).
        """
        reason = self._clean_rejection_reason(reason)
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status != BookingStatus.PENDING:
                raise BookingNotRejectable("Only pending bookings can be rejected.")

            before = self._reject_snapshot(booking)
            booking.status = BookingStatus.REJECTED
            booking.rejection_reason = reason
            booking.save(update_fields=["status", "rejection_reason", "updated_at"])

            self.audit.record(
                actor_id=admin.id,
                action=BOOKING_REJECT_AUDIT_ACTION,
                target_type=BOOKING_ENTITY_TYPE,
                target_id=str(booking.id),
                before=before,
                after=self._reject_snapshot(booking),
            )
            notification = self.notifications.create(
                recipient_id=booking.customer_id,
                event_key=BOOKING_REJECTED_EVENT,
                entity_type=BOOKING_ENTITY_TYPE,
                entity_id=booking.id,
                payload={
                    "reference": booking.reference,
                    "booking_id": str(booking.id),
                    "status": booking.status,
                    "rejection_reason": reason,
                },
            )
            if notification is None:
                raise RuntimeError("booking.rejected notification was not created.")
            return booking

    @staticmethod
    def _clean_rejection_reason(reason: str | None) -> str:
        cleaned = (reason or "").strip()
        if not cleaned:
            raise ValidationError(
                {"rejection_reason": ["Enter a reason for rejecting this booking."]}
            )
        if len(cleaned) > REJECTION_REASON_MAX_LENGTH:
            raise ValidationError(
                {
                    "rejection_reason": [
                        "Reason must be "
                        f"{REJECTION_REASON_MAX_LENGTH} characters or fewer."
                    ]
                }
            )
        return cleaned

    @staticmethod
    def _reject_snapshot(booking: Booking) -> dict[str, Any]:
        """Audit snapshot for reject: status, reason and (unchanged) window state."""
        window = getattr(booking, "payment_window", None)
        return {
            "status": booking.status,
            "rejection_reason": booking.rejection_reason,
            "payment_window_status": window.status if window else None,
        }

    @staticmethod
    def _decision_snapshot(booking: Booking, *, window=None) -> dict[str, Any]:
        """Audit before/after snapshot of the booking and its window state."""
        if window is None:
            window = getattr(booking, "payment_window", None)
        deadline = window.deadline_at if window else None
        return {
            "status": booking.status,
            "approved_at": booking.approved_at.isoformat()
            if booking.approved_at
            else None,
            "payment_window_status": window.status if window else None,
            "payment_window_deadline_at": deadline.isoformat() if deadline else None,
        }

    def _create_booking_row(
        self,
        *,
        customer,
        package: TourPackage,
        available_date: AvailableDate,
        payload: dict[str, Any],
    ) -> Booking:
        last_error: Exception | None = None
        for _ in range(MAX_REFERENCE_RETRIES):
            booking_id = uuid.uuid4()
            reference = reference_from_uuid(booking_id)
            try:
                with transaction.atomic():
                    return Booking.objects.create(
                        id=booking_id,
                        reference=reference,
                        customer=customer,
                        package=package,
                        available_date=available_date,
                        status=BookingStatus.PENDING,
                        travelers=payload["travelers"],
                        contact_name=payload["contact_name"],
                        contact_email=payload["contact_email"],
                        contact_phone=payload["contact_phone"],
                        additional_requirements=payload["additional_requirements"],
                    )
            except IntegrityError as exc:
                if "reference" not in str(exc).lower():
                    raise
                last_error = exc
                continue
        raise ValidationError(
            {"reference": ["Could not allocate a unique booking reference."]}
        ) from last_error

    @staticmethod
    def _require_published_package(package_id) -> TourPackage:
        try:
            package = TourPackage.objects.get(pk=package_id)
        except TourPackage.DoesNotExist as exc:
            raise ValidationError({"package_id": ["Package not found."]}) from exc
        if package.status != PackageStatus.PUBLISHED:
            raise ValidationError(
                {"package_id": ["Only published packages can be booked."]}
            )
        return package

    @staticmethod
    def _require_active_date(package: TourPackage, available_date_id) -> AvailableDate:
        try:
            available_date = AvailableDate.objects.get(pk=available_date_id)
        except AvailableDate.DoesNotExist as exc:
            raise ValidationError(
                {"available_date_id": ["Available date not found."]}
            ) from exc
        if available_date.package_id != package.id:
            raise ValidationError(
                {
                    "available_date_id": [
                        "Available date does not belong to the selected package."
                    ]
                }
            )
        if not available_date.is_active:
            raise ValidationError(
                {"available_date_id": ["Selected available date is not active."]}
            )
        return available_date
