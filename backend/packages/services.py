"""PackageService — package lifecycle + atomic audit (AD-4 / AD-22)."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction

from audit.services import AuditService
from packages.models import PackageStatus, TourPackage

TARGET_TYPE = "package"


def _snapshot(package: TourPackage) -> dict[str, Any]:
    return {
        "id": str(package.id),
        "title": package.title,
        "short_description": package.short_description,
        "full_description": package.full_description,
        "destinations": package.destinations,
        "duration_days": package.duration_days,
        "duration_nights": package.duration_nights,
        "starting_location": package.starting_location,
        "base_price": str(package.base_price),
        "currency": package.currency,
        "cover_image": package.cover_image,
        "additional_images": package.additional_images,
        "included_services": package.included_services,
        "excluded_services": package.excluded_services,
        "itinerary": package.itinerary,
        "difficulty": package.difficulty,
        "cancellation_policy": package.cancellation_policy,
        "additional_info": package.additional_info,
        "status": package.status,
        "is_featured": package.is_featured,
    }


class PackageService:
    def __init__(self, audit: AuditService | None = None):
        self.audit = audit or AuditService()

    def create_draft(self, *, actor_id: UUID, data: dict[str, Any]) -> TourPackage:
        with transaction.atomic():
            package = TourPackage(
                **self._writable_fields(data),
                status=PackageStatus.DRAFT,
            )
            package.full_clean()
            package.save()
            self.audit.record(
                actor_id=actor_id,
                action="package.create",
                target_type=TARGET_TYPE,
                target_id=str(package.id),
                before=None,
                after=_snapshot(package),
            )
            return package

    def update(self, *, actor_id: UUID, package: TourPackage, data: dict[str, Any]) -> TourPackage:
        with transaction.atomic():
            before = _snapshot(package)
            for key, value in self._writable_fields(data).items():
                setattr(package, key, value)
            package.full_clean()
            package.save()
            self.audit.record(
                actor_id=actor_id,
                action="package.update",
                target_type=TARGET_TYPE,
                target_id=str(package.id),
                before=before,
                after=_snapshot(package),
            )
            return package

    def publish(self, *, actor_id: UUID, package: TourPackage) -> TourPackage:
        with transaction.atomic():
            locked = TourPackage.objects.select_for_update().get(pk=package.pk)
            if locked.status != PackageStatus.DRAFT:
                raise ValidationError(
                    {"status": "Only draft packages can be published."}
                )
            before = _snapshot(locked)
            locked.status = PackageStatus.PUBLISHED
            locked.full_clean()
            locked.save(update_fields=["status", "updated_at"])
            self.audit.record(
                actor_id=actor_id,
                action="package.publish_state_change",
                target_type=TARGET_TYPE,
                target_id=str(locked.id),
                before=before,
                after=_snapshot(locked),
            )
            return locked

    def unpublish(self, *, actor_id: UUID, package: TourPackage) -> TourPackage:
        with transaction.atomic():
            locked = TourPackage.objects.select_for_update().get(pk=package.pk)
            if locked.status != PackageStatus.PUBLISHED:
                raise ValidationError(
                    {"status": "Only published packages can be unpublished."}
                )
            before = _snapshot(locked)
            locked.status = PackageStatus.DRAFT
            locked.is_featured = False
            locked.full_clean()
            locked.save(update_fields=["status", "is_featured", "updated_at"])
            self.audit.record(
                actor_id=actor_id,
                action="package.publish_state_change",
                target_type=TARGET_TYPE,
                target_id=str(locked.id),
                before=before,
                after=_snapshot(locked),
            )
            return locked

    def _writable_fields(self, data: dict[str, Any]) -> dict[str, Any]:
        # Media fields intentionally omitted — Story 2.3 owns upload/validation.
        allowed = {
            "title",
            "short_description",
            "full_description",
            "destinations",
            "duration_days",
            "duration_nights",
            "starting_location",
            "base_price",
            "currency",
            "included_services",
            "excluded_services",
            "itinerary",
            "difficulty",
            "cancellation_policy",
            "additional_info",
        }
        out: dict[str, Any] = {}
        for key in allowed:
            if key not in data:
                continue
            value = data[key]
            if key == "base_price" and value is not None and not isinstance(value, Decimal):
                try:
                    value = Decimal(str(value))
                except (InvalidOperation, ValueError) as exc:
                    raise ValidationError({"base_price": "Invalid price."}) from exc
            if key == "currency" and isinstance(value, str):
                value = value.strip().upper()
            out[key] = value
        return out
