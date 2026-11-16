"""PaymentService — exclusive writer of PaymentWindow rows (AD-16)."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import IntegrityError, transaction

from payments.models import (
    Payment,
    PaymentProvider,
    PaymentStatus,
    PaymentWindow,
    PaymentWindowStatus,
)

if TYPE_CHECKING:
    from bookings.models import Booking


class PaymentService:
    """Owns payment + payment-window writes. Callers must be inside atomic blocks."""

    def create_not_open_for_booking(self, booking: Booking) -> PaymentWindow:
        """Create the single NOT_OPEN window and an initial UNPAID payment row.

        Must not be called twice for the same booking (unique booking_id).
        """
        package = booking.package
        amount = Decimal(package.base_price)
        currency = package.currency

        try:
            with transaction.atomic():
                Payment.objects.create(
                    booking=booking,
                    status=PaymentStatus.UNPAID,
                    amount=amount,
                    currency=currency,
                    provider=PaymentProvider.MOCK,
                )
                window = PaymentWindow.objects.create(
                    booking=booking,
                    status=PaymentWindowStatus.NOT_OPEN,
                    opened_at=None,
                    deadline_at=None,
                )
        except IntegrityError as exc:
            raise ValueError(
                "A payment window already exists for this booking."
            ) from exc
        return window
