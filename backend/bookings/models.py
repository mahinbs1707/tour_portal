"""Catalog booking requests (AD-7 / AD-9 / Story 5.1)."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class BookingStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"


class Booking(models.Model):
    """Customer booking request for a published package available date."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=12, unique=True, db_index=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    package = models.ForeignKey(
        "packages.TourPackage",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    available_date = models.ForeignKey(
        "packages.AvailableDate",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    status = models.CharField(
        max_length=16,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        db_index=True,
    )
    travelers = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=64)
    additional_requirements = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # One open request per customer per package (PENDING or APPROVED).
            # CANCELLED / REJECTED free the slot so the customer can rebook.
            models.UniqueConstraint(
                fields=["customer", "package"],
                condition=models.Q(
                    status__in=["PENDING", "APPROVED"],
                ),
                name="uniq_active_booking_customer_package",
            ),
        ]

    def __str__(self) -> str:
        return f"Booking {self.reference} ({self.status})"
