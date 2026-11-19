"""Private custom tour submissions (AD-7 / Story 8.1)."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class CustomTourStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class CustomTour(models.Model):
    """Customer-owned bespoke tour request — never in public catalog."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="custom_tours",
    )
    status = models.CharField(
        max_length=16,
        choices=CustomTourStatus.choices,
        default=CustomTourStatus.PENDING,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    destination = models.CharField(max_length=500)
    start_date = models.DateField()
    end_date = models.DateField()
    travelers = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    estimated_budget = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=16)
    accommodation_preferences = models.TextField(blank=True, default="")
    transportation_preferences = models.TextField(blank=True, default="")
    preferred_activities = models.TextField(blank=True, default="")
    additional_requirements = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")
    recommended_adjustments = models.TextField(blank=True, default="")
    reapply_enabled = models.BooleanField(default=False)
    review_cycle = models.PositiveIntegerField(default=1)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"CustomTour {self.id} ({self.status})"


class CustomTourReviewDecision(models.TextChoices):
    REJECTED = "REJECTED", "Rejected"
    APPROVED = "APPROVED", "Approved"


class CustomTourReview(models.Model):
    """Prior review cycle snapshot (Story 8.4 / FR-CT-29)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    custom_tour = models.ForeignKey(
        CustomTour,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    cycle = models.PositiveIntegerField()
    decision = models.CharField(
        max_length=16,
        choices=CustomTourReviewDecision.choices,
    )
    rejection_reason = models.TextField(blank=True, default="")
    recommended_adjustments = models.TextField(blank=True, default="")
    decided_at = models.DateTimeField()
    admin_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["cycle", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["custom_tour", "cycle"],
                name="uniq_custom_tour_review_cycle",
            ),
        ]

    def __str__(self) -> str:
        return f"CustomTourReview {self.custom_tour_id} cycle {self.cycle}"


class CustomTourSubmitIdempotency(models.Model):
    """Maps (customer, Idempotency-Key) → created CustomTour (Story 8.1 / 3A)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_tour_idempotency_keys",
    )
    idempotency_key = models.CharField(max_length=128)
    custom_tour = models.ForeignKey(
        CustomTour,
        on_delete=models.CASCADE,
        related_name="submit_idempotency_rows",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "idempotency_key"],
                name="uniq_custom_tour_submit_idempotency",
            ),
        ]