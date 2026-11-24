"""Shared payment-window eligibility (Story 6.4 / Epic 7 / custom-tour pay)."""

from __future__ import annotations

from datetime import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from bookings.models import Booking, BookingStatus
from custom_tours.models import CustomTour, CustomTourStatus
from payments.models import PaymentStatus, PaymentWindowStatus


class PaymentNotEligible(Exception):
    """Checkout / payment attempt must be rejected for this target."""


def _window_open_and_before_deadline(window, *, now: datetime | None) -> bool:
    if window.status != PaymentWindowStatus.OPEN:
        return False
    if window.deadline_at is None:
        return False
    instant = now or timezone.now()
    return instant < window.deadline_at


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
    return _window_open_and_before_deadline(window, now=now)


def assert_payment_eligible(booking: Booking, *, now: datetime | None = None) -> None:
    """Raise ``PaymentNotEligible`` when ``is_payment_eligible`` would be false."""
    if not is_payment_eligible(booking, now=now):
        raise PaymentNotEligible("This booking is not eligible for payment.")


def is_custom_tour_payment_eligible(
    tour: CustomTour, *, now: datetime | None = None
) -> bool:
    """Payable when APPROVED, not SUCCESS-paid, window OPEN, and before deadline."""
    if tour.status != CustomTourStatus.APPROVED:
        return False
    payment = tour.payments.order_by("-created_at", "-id").first()
    if payment and payment.status == PaymentStatus.SUCCESS:
        return False
    try:
        window = tour.payment_window
    except ObjectDoesNotExist:
        return False
    return _window_open_and_before_deadline(window, now=now)


def assert_custom_tour_payment_eligible(
    tour: CustomTour, *, now: datetime | None = None
) -> None:
    if not is_custom_tour_payment_eligible(tour, now=now):
        raise PaymentNotEligible("This custom tour is not eligible for payment.")
