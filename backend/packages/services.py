"""PackageService — package lifecycle + atomic audit (AD-4 / AD-22)."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction

from audit.services import AuditService
from packages.media import (
    ADDITIONAL_IMAGES_MAX,
    delete_media_file,
    save_package_image,
)
from packages.models import AvailableDate, PackageStatus, TourPackage

TARGET_TYPE = "package"
DATE_TARGET_TYPE = "available_date"


def _date_snapshot(row: AvailableDate) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "package_id": str(row.package_id),
        "tour_date": row.tour_date.isoformat(),
        "is_active": row.is_active,
    }


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

    def create_available_date(
        self,
        *,
        actor_id: UUID,
        package: TourPackage,
        tour_date,
    ) -> AvailableDate:
        with transaction.atomic():
            row = AvailableDate(
                package=package,
                tour_date=tour_date,
                is_active=True,
            )
            row.full_clean()
            row.save()
            self.audit.record(
                actor_id=actor_id,
                action="available_date.create",
                target_type=DATE_TARGET_TYPE,
                target_id=str(row.id),
                before=None,
                after=_date_snapshot(row),
            )
            return row

    def update_available_date(
        self,
        *,
        actor_id: UUID,
        row: AvailableDate,
        tour_date=None,
    ) -> AvailableDate:
        with transaction.atomic():
            locked = AvailableDate.objects.select_for_update().get(pk=row.pk)
            if tour_date is not None:
                locked.tour_date = tour_date
            locked.full_clean()
            locked.save()
            # Closed audit catalog has no available_date.update — create/deactivate only.
            return locked

    def delete_available_date(self, *, row: AvailableDate) -> None:
        with transaction.atomic():
            locked = AvailableDate.objects.select_for_update().get(pk=row.pk)
            if locked.has_booking_references():
                raise ValidationError(
                    {
                        "detail": (
                            "Cannot hard-delete an available date referenced by "
                            "bookings. Deactivate it instead."
                        )
                    }
                )
            locked.delete()

    def deactivate_available_date(
        self,
        *,
        actor_id: UUID,
        row: AvailableDate,
    ) -> AvailableDate:
        with transaction.atomic():
            locked = AvailableDate.objects.select_for_update().get(pk=row.pk)
            if not locked.is_active:
                raise ValidationError(
                    {"is_active": "Available date is already inactive."}
                )
            before = _date_snapshot(locked)
            locked.is_active = False
            locked.full_clean()
            locked.save(update_fields=["is_active", "updated_at"])
            self.audit.record(
                actor_id=actor_id,
                action="available_date.deactivate",
                target_type=DATE_TARGET_TYPE,
                target_id=str(locked.id),
                before=before,
                after=_date_snapshot(locked),
            )
            return locked

    def set_cover_image(
        self,
        *,
        actor_id: UUID,
        package: TourPackage,
        uploaded,
    ) -> TourPackage:
        # Validate + write file before the DB transaction so rejects leave nothing.
        new_url = save_package_image(
            package_id=package.id,
            uploaded=uploaded,
            kind="cover",
        )
        old_url = ""
        try:
            with transaction.atomic():
                locked = TourPackage.objects.select_for_update().get(pk=package.pk)
                before = _snapshot(locked)
                old_url = locked.cover_image or ""
                locked.cover_image = new_url
                locked.full_clean()
                locked.save(update_fields=["cover_image", "updated_at"])
                self.audit.record(
                    actor_id=actor_id,
                    action="package.update",
                    target_type=TARGET_TYPE,
                    target_id=str(locked.id),
                    before=before,
                    after=_snapshot(locked),
                )
                package = locked
        except Exception:
            delete_media_file(new_url)
            raise
        if old_url and old_url != new_url:
            delete_media_file(old_url)
        return package

    def clear_cover_image(
        self,
        *,
        actor_id: UUID,
        package: TourPackage,
    ) -> TourPackage:
        with transaction.atomic():
            locked = TourPackage.objects.select_for_update().get(pk=package.pk)
            before = _snapshot(locked)
            old_url = locked.cover_image or ""
            locked.cover_image = ""
            locked.full_clean()
            locked.save(update_fields=["cover_image", "updated_at"])
            self.audit.record(
                actor_id=actor_id,
                action="package.update",
                target_type=TARGET_TYPE,
                target_id=str(locked.id),
                before=before,
                after=_snapshot(locked),
            )
            package = locked
        if old_url:
            delete_media_file(old_url)
        return package

    def append_additional_image(
        self,
        *,
        actor_id: UUID,
        package: TourPackage,
        uploaded,
    ) -> TourPackage:
        locked_pre = TourPackage.objects.get(pk=package.pk)
        current = list(locked_pre.additional_images or [])
        if len(current) >= ADDITIONAL_IMAGES_MAX:
            raise ValidationError(
                {
                    "file": (
                        f"At most {ADDITIONAL_IMAGES_MAX} additional images "
                        "are allowed."
                    )
                }
            )
        new_url = save_package_image(
            package_id=package.id,
            uploaded=uploaded,
            kind="additional",
        )
        try:
            with transaction.atomic():
                locked = TourPackage.objects.select_for_update().get(pk=package.pk)
                images = list(locked.additional_images or [])
                if len(images) >= ADDITIONAL_IMAGES_MAX:
                    raise ValidationError(
                        {
                            "file": (
                                f"At most {ADDITIONAL_IMAGES_MAX} additional "
                                "images are allowed."
                            )
                        }
                    )
                before = _snapshot(locked)
                images.append(new_url)
                locked.additional_images = images
                locked.full_clean()
                locked.save(update_fields=["additional_images", "updated_at"])
                self.audit.record(
                    actor_id=actor_id,
                    action="package.update",
                    target_type=TARGET_TYPE,
                    target_id=str(locked.id),
                    before=before,
                    after=_snapshot(locked),
                )
                return locked
        except Exception:
            delete_media_file(new_url)
            raise

    def remove_additional_image(
        self,
        *,
        actor_id: UUID,
        package: TourPackage,
        index: int,
    ) -> TourPackage:
        with transaction.atomic():
            locked = TourPackage.objects.select_for_update().get(pk=package.pk)
            images = list(locked.additional_images or [])
            if index < 0 or index >= len(images):
                raise ValidationError(
                    {"index": "Additional image index is out of range."}
                )
            before = _snapshot(locked)
            removed_url = images.pop(index)
            locked.additional_images = images
            locked.full_clean()
            locked.save(update_fields=["additional_images", "updated_at"])
            self.audit.record(
                actor_id=actor_id,
                action="package.update",
                target_type=TARGET_TYPE,
                target_id=str(locked.id),
                before=before,
                after=_snapshot(locked),
            )
            package = locked
        if removed_url:
            delete_media_file(removed_url)
        return package
