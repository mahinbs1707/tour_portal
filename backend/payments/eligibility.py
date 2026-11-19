"""Shared payment-window eligibility (Story 6.4 / Epic 7 precursor)."""

from __future__ import annotations

from datetime import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from bookings.models import Booking, BookingStatus
from payments.models import PaymentStatus, PaymentWindowStatus


class PaymentNotEligible(Exception):
    """Checkout / payment attempt must be rejected for this booking."""


def is_payment_eligible(
    booking: Booking, *, now: datetime | None = None
) -> bool:
    """Payable when APPROVED, not SUCCESS-paid, window OPEN, and before deadline."""
    if booking.status != BookingStatus.APPROVED:
        return False
    payment = booking.payments.order_by("-created_at", "-id").first()
    if payment and payment.status == PaymentStatus.SUCCESS:
        return False
    try:
        window = booking.payment_window
    except ObjectDoesNotExist:
        return False
    if window.status != PaymentWindowStatus.OPEN:
        return False
    if window.deadline_at is None:
        return False
    instant = now or timezone.now()
    return instant < window.deadline_at


def assert_payment_eligible(booking: Booking, *, now: datetime | None = None) -> None:
    """Raise ``PaymentNotEligible`` when ``is_payment_eligible`` would be false."""
    if not is_payment_eligible(booking, now=now):
        raise PaymentNotEligible("This booking is not eligible for payment.")