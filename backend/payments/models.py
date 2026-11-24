"""Payment attempts and payment-window state (AD-7 / AD-9 / AD-10 / AD-16)."""

from __future__ import annotations

import uuid

from django.db import models
from django.db.models import Q


class PaymentStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PENDING = "PENDING", "Pending"
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentWindowStatus(models.TextChoices):
    NOT_OPEN = "NOT_OPEN", "Not open"
    OPEN = "OPEN", "Open"
    EXPIRED = "EXPIRED", "Expired"


class PaymentProvider(models.TextChoices):
    MOCK = "MOCK", "Mock"


class Payment(models.Model):
    """Payment attempt / ledger row for a booking or custom tour."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )
    custom_tour = models.ForeignKey(
        "custom_tours.CustomTour",
        on_delete=models.CASCADE,
        related_name="payments",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=16,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=16)
    provider = models.CharField(
        max_length=16,
        choices=PaymentProvider.choices,
        default=PaymentProvider.MOCK,
    )
    attempt_reference = models.CharField(max_length=64, blank=True, default="")
    provider_external_id = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (Q(booking__isnull=False) & Q(custom_tour__isnull=True))
                    | (Q(booking__isnull=True) & Q(custom_tour__isnull=False))
                ),
                name="payments_payment_exactly_one_owner",
            ),
            models.UniqueConstraint(
                fields=["booking"],
                condition=Q(status=PaymentStatus.SUCCESS, booking__isnull=False),
                name="payments_payment_unique_success_per_booking",
            ),
            models.UniqueConstraint(
                fields=["custom_tour"],
                condition=Q(status=PaymentStatus.SUCCESS, custom_tour__isnull=False),
                name="payments_payment_unique_success_per_custom_tour",
            ),
        ]

    def __str__(self) -> str:
        return f"Payment {self.id} ({self.status})"


class PaymentWindow(models.Model):
    """Exactly one payment window per booking or custom tour — writes via PaymentService."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment_window",
        null=True,
        blank=True,
    )
    custom_tour = models.OneToOneField(
        "custom_tours.CustomTour",
        on_delete=models.CASCADE,
        related_name="payment_window",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=16,
        choices=PaymentWindowStatus.choices,
        default=PaymentWindowStatus.NOT_OPEN,
        db_index=True,
    )
    opened_at = models.DateTimeField(null=True, blank=True)
    deadline_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (Q(booking__isnull=False) & Q(custom_tour__isnull=True))
                    | (Q(booking__isnull=True) & Q(custom_tour__isnull=False))
                ),
                name="payments_window_exactly_one_owner",
            ),
        ]

    def __str__(self) -> str:
        owner = self.booking_id or self.custom_tour_id
        return f"PaymentWindow {owner} ({self.status})"
