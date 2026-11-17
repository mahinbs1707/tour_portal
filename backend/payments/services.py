"""PaymentService — exclusive writer of PaymentWindow rows (AD-16)."""

from __future__ import annotations

from datetime import datetime, timedelta
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

PAYMENT_WINDOW_HOURS = 24


class PaymentWindowMissing(ValueError):
    """The booking has no PaymentWindow row (corrupt state — never insert one here)."""


class PaymentWindowNotOpenable(ValueError):
    """The booking's window is not ``NOT_OPEN`` so it cannot be opened."""


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

    def open_window_for_booking(
        self, booking: Booking, *, opened_at: datetime
    ) -> PaymentWindow:
        """Open the booking's existing ``NOT_OPEN`` window (Story 6.2).

        Updates the same row — never inserts. ``opened_at`` is the approval
        timestamp; ``deadline_at = opened_at + 24h``. Payment rows are untouched
        (payment stays ``UNPAID``). Callers must be inside an atomic block.

        Raises ``PaymentWindowMissing`` when no window row exists and
        ``PaymentWindowNotOpenable`` when it is not ``NOT_OPEN``.
        """
        try:
            window = PaymentWindow.objects.select_for_update().get(
                booking_id=booking.pk
            )
        except PaymentWindow.DoesNotExist as exc:
            raise PaymentWindowMissing(
                "This booking has no payment window to open."
            ) from exc
        if window.status != PaymentWindowStatus.NOT_OPEN:
            raise PaymentWindowNotOpenable(
                "The payment window for this booking is not awaiting approval."
            )
        window.status = PaymentWindowStatus.OPEN
        window.opened_at = opened_at
        window.deadline_at = opened_at + timedelta(hours=PAYMENT_WINDOW_HOURS)
        window.save(update_fields=["status", "opened_at", "deadline_at", "updated_at"])
        return window
