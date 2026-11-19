"""PaymentService — exclusive writer of PaymentWindow rows (AD-16)."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import IntegrityError, transaction
from django.utils import timezone

from notifications.services import NotificationService
from payments.eligibility import PaymentNotEligible, assert_payment_eligible
from payments.models import (
    Payment,
    PaymentProvider,
    PaymentStatus,
    PaymentWindow,
    PaymentWindowStatus,
)
from payments.providers.mock import MockPaymentProvider
from payments.providers.protocol import MOCK_ATTEMPT_OUTCOMES

if TYPE_CHECKING:
    from bookings.models import Booking

from bookings.models import Booking, BookingStatus

PAYMENT_WINDOW_HOURS = 24


class PaymentWindowMissing(ValueError):
    """The booking has no PaymentWindow row (corrupt state — never insert one here)."""


class PaymentWindowNotOpenable(ValueError):
    """The booking's window is not ``NOT_OPEN`` so it cannot be opened."""


class PaymentWindowNotReopenable(ValueError):
    """The booking's window is not ``EXPIRED`` so it cannot be reopened."""


class PaymentWindowNotExtendable(ValueError):
    """The window cannot be extended (missing, or still ``NOT_OPEN``)."""


class PaymentDeadlineNotFuture(ValueError):
    """Extend target ``deadline_at`` must be strictly after ``now``."""


class PaymentAlreadySucceeded(Exception):
    """This booking already has a SUCCESS payment (Story 7.1)."""


class InvalidPaymentOutcome(ValueError):
    """Attempt outcome must be SUCCESS, FAILED, or CANCELLED."""


PAYMENT_ENTITY_TYPE = "payment"
PAYMENT_SUCCESS_EVENT = "payment.success"
PAYMENT_FAILED_EVENT = "payment.failed"


class PaymentService:
    """Owns payment + payment-window writes. Callers must be inside atomic blocks."""

    def __init__(
        self,
        *,
        provider: MockPaymentProvider | None = None,
        notifications: NotificationService | None = None,
    ):
        self._provider = provider or MockPaymentProvider()
        self._notifications = notifications or NotificationService()

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

    def mark_expired_if_past_deadline(
        self, booking: Booking, *, now: datetime | None = None
    ) -> PaymentWindow | None:
        """Mark an overdue ``OPEN`` window ``EXPIRED`` (Story 6.4 — no cron in MVP).

        No-op when the booking is not ``APPROVED``, the window is not ``OPEN``,
        or ``deadline_at`` is still in the future. Returns the updated row or
        ``None`` when nothing changed. Callers must be inside an atomic block.
        """
        instant = now or timezone.now()
        try:
            window = PaymentWindow.objects.select_for_update().get(
                booking_id=booking.pk
            )
        except PaymentWindow.DoesNotExist:
            return None
        booking.refresh_from_db(fields=["status"])
        if booking.status != BookingStatus.APPROVED:
            return None
        if window.status != PaymentWindowStatus.OPEN:
            return None
        if window.deadline_at is None or instant < window.deadline_at:
            return None
        window.status = PaymentWindowStatus.EXPIRED
        window.expired_at = instant
        window.save(update_fields=["status", "expired_at", "updated_at"])
        return window

    def reopen_window_for_booking(self, booking: Booking) -> PaymentWindow:
        """Reopen an ``EXPIRED`` window without changing ``deadline_at`` (Story 6.4).

        Updates the same row to ``OPEN``. Callers must be inside an atomic block.
        """
        try:
            window = PaymentWindow.objects.select_for_update().get(
                booking_id=booking.pk
            )
        except PaymentWindow.DoesNotExist as exc:
            raise PaymentWindowMissing(
                "This booking has no payment window to reopen."
            ) from exc
        if window.status != PaymentWindowStatus.EXPIRED:
            raise PaymentWindowNotReopenable(
                "Only an expired payment window can be reopened."
            )
        window.status = PaymentWindowStatus.OPEN
        window.save(update_fields=["status", "updated_at"])
        return window

    def extend_window_deadline(
        self,
        booking: Booking,
        *,
        deadline_at: datetime,
        now: datetime | None = None,
    ) -> PaymentWindow:
        """Set a future ``deadline_at`` on the existing window (Story 6.4).

        Window must not be ``NOT_OPEN``. Sets status to ``OPEN``. Callers must
        be inside an atomic block.
        """
        instant = now or timezone.now()
        if timezone.is_naive(deadline_at):
            deadline_at = timezone.make_aware(
                deadline_at, timezone.get_current_timezone()
            )
        if deadline_at <= instant:
            raise PaymentDeadlineNotFuture(
                "The payment deadline must be in the future."
            )
        try:
            window = PaymentWindow.objects.select_for_update().get(
                booking_id=booking.pk
            )
        except PaymentWindow.DoesNotExist as exc:
            raise PaymentWindowMissing(
                "This booking has no payment window to extend."
            ) from exc
        if window.status == PaymentWindowStatus.NOT_OPEN:
            raise PaymentWindowNotExtendable(
                "The payment window has not been opened yet."
            )
        window.deadline_at = deadline_at
        window.status = PaymentWindowStatus.OPEN
        window.expired_at = None
        window.save(
            update_fields=["deadline_at", "status", "expired_at", "updated_at"]
        )
        return window

    def record_mock_attempt(
        self,
        booking: Booking,
        *,
        customer,
        outcome: str,
    ) -> Payment:
        """Persist a mock attempt as a new payment row (Story 7.1).

        Eligibility is enforced for every outcome. SUCCESS is guarded by an
        existence check, row lock, and partial unique constraint. Emits
        ``payment.success`` / ``payment.failed`` notifications only.
        """
        if outcome not in MOCK_ATTEMPT_OUTCOMES:
            raise InvalidPaymentOutcome(
                "Outcome must be SUCCESS, FAILED, or CANCELLED."
            )
        with transaction.atomic():
            locked = (
                Booking.objects.select_for_update()
                .select_related("package", "payment_window")
                .get(pk=booking.pk)
            )
            if locked.customer_id != customer.id:
                raise PaymentNotEligible("You cannot pay for this booking.")

            if Payment.objects.filter(
                booking_id=locked.pk, status=PaymentStatus.SUCCESS
            ).exists():
                raise PaymentAlreadySucceeded(
                    "This booking already has a successful payment."
                )

            try:
                assert_payment_eligible(locked)
            except PaymentNotEligible as exc:
                raise PaymentNotEligible(str(exc)) from exc

            provider_result = self._provider.record_mock_attempt(outcome=outcome)
            amount = locked.package.base_price
            currency = locked.package.currency

            try:
                payment = Payment.objects.create(
                    booking=locked,
                    status=outcome,
                    amount=amount,
                    currency=currency,
                    provider=PaymentProvider.MOCK,
                    attempt_reference=provider_result.attempt_reference,
                )
            except IntegrityError as exc:
                if outcome == PaymentStatus.SUCCESS:
                    raise PaymentAlreadySucceeded(
                        "This booking already has a successful payment."
                    ) from exc
                raise

            if outcome == PaymentStatus.SUCCESS:
                self._emit_payment_notification(
                    booking=locked,
                    customer_id=customer.id,
                    event_key=PAYMENT_SUCCESS_EVENT,
                    payment=payment,
                )
            elif outcome == PaymentStatus.FAILED:
                self._emit_payment_notification(
                    booking=locked,
                    customer_id=customer.id,
                    event_key=PAYMENT_FAILED_EVENT,
                    payment=payment,
                )

            return payment

    def _emit_payment_notification(
        self,
        *,
        booking: Booking,
        customer_id,
        event_key: str,
        payment: Payment,
    ) -> None:
        notification = self._notifications.create(
            recipient_id=customer_id,
            event_key=event_key,
            entity_type=PAYMENT_ENTITY_TYPE,
            entity_id=payment.id,
            payload={
                "reference": booking.reference,
                "booking_id": str(booking.id),
                "payment_id": str(payment.id),
                "payment_status": payment.status,
            },
        )
        if notification is None:
            raise RuntimeError(f"{event_key} notification was not created.")
