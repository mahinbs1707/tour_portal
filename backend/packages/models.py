"""Tour package catalog inventory (Story 2.1 — no seats)."""

from __future__ import annotations

import uuid

from django.db import models


class PackageStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"


class TourPackage(models.Model):
    """Admin-managed catalog package. No seat/capacity fields (BR-20 / FR-PKG)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    short_description = models.TextField()
    full_description = models.TextField()
    destinations = models.TextField()
    duration_days = models.PositiveIntegerField()
    duration_nights = models.PositiveIntegerField()
    starting_location = models.CharField(max_length=255)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=16)  # free-text ISO; OPEN-01 closed list deferred
    cover_image = models.CharField(max_length=512, blank=True, default="")
    additional_images = models.JSONField(default=list, blank=True)
    included_services = models.TextField()
    excluded_services = models.TextField()
    itinerary = models.TextField()
    difficulty = models.CharField(max_length=64, blank=True, default="")
    cancellation_policy = models.TextField(blank=True, default="")
    additional_info = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=PackageStatus.choices,
        default=PackageStatus.DRAFT,
        db_index=True,
    )
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"
