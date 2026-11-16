"""BookingService — catalog booking create (AD-16 / AD-17 / AD-20)."""

from __future__ import annotations

import uuid
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from notifications.services import NotificationService
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import assert_bookable_date
from payments.services import PaymentService

from bookings.models import Booking, BookingStatus

REFERENCE_HEX_LEN = 12
MAX_REFERENCE_RETRIES = 5
BOOKING_ENTITY_TYPE = "booking"
BOOKING_SUBMITTED_EVENT = "booking.submitted"


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
    ):
        self.payments = payments or PaymentService()
        self.notifications = notifications or NotificationService()

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
