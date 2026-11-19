"""CustomTourService — create + Admin review (AD-7 / AD-17 / AD-20 / AD-22)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from audit.services import AuditService
from custom_tours.models import (
    CustomTour,
    CustomTourReview,
    CustomTourReviewDecision,
    CustomTourSubmitIdempotency,
    CustomTourStatus,
)
from notifications.services import NotificationService
from packages.validators import assert_bookable_date

CUSTOM_TOUR_ENTITY_TYPE = "custom_tour"
CUSTOM_TOUR_SUBMITTED_EVENT = "custom_tour.submitted"
CUSTOM_TOUR_APPROVED_EVENT = "custom_tour.approved"
CUSTOM_TOUR_REJECTED_EVENT = "custom_tour.rejected"
CUSTOM_TOUR_REAPPLY_ENABLED_EVENT = "custom_tour.reapply_enabled"
CUSTOM_TOUR_RESUBMITTED_EVENT = "custom_tour.resubmitted"
CUSTOM_TOUR_APPROVE_AUDIT_ACTION = "custom_tour.approve"
CUSTOM_TOUR_REJECT_AUDIT_ACTION = "custom_tour.reject"
IDEMPOTENCY_KEY_MAX_LEN = 128
REJECTION_REASON_MAX_LENGTH = 2000
ADJUSTMENTS_MAX_LENGTH = 2000


class CustomTourNotApprovable(Exception):
    """Raised when Admin approves a tour that cannot be approved."""


class CustomTourNotRejectable(Exception):
    """Raised when Admin rejects a tour that cannot be rejected."""


class CustomTourReapplyNotAllowed(Exception):
    """Raised when Customer reapply is not permitted (Story 8.3 / 8.4)."""


class CustomTourService:
    def __init__(
        self,
        *,
        notifications: NotificationService | None = None,
        audit: AuditService | None = None,
    ):
        self.notifications = notifications or NotificationService()
        self.audit = audit or AuditService()

    def create(
        self,
        *,
        customer,
        title: str,
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
        estimated_budget: Decimal,
        currency: str,
        accommodation_preferences: str = "",
        transportation_preferences: str = "",
        preferred_activities: str = "",
        additional_requirements: str = "",
        idempotency_key: str | None = None,
    ) -> tuple[CustomTour, bool]:
        """Create PENDING custom tour + notification. Returns (tour, created)."""
        key = (idempotency_key or "").strip()
        if key and len(key) > IDEMPOTENCY_KEY_MAX_LEN:
            raise ValidationError(
                {"idempotency_key": ["Idempotency-Key header is too long."]}
            )

        if key:
            existing = self._existing_for_key(customer=customer, key=key)
            if existing is not None:
                return existing, False

        if end_date < start_date:
            raise ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )

        try:
            assert_bookable_date(start_date)
        except ValueError as exc:
            raise ValidationError({"start_date": [str(exc)]}) from exc

        if travelers < 1:
            raise ValidationError({"travelers": ["Enter at least 1 traveler."]})

        if estimated_budget <= 0:
            raise ValidationError(
                {"estimated_budget": ["Estimated budget must be greater than zero."]}
            )

        with transaction.atomic():
            tour = CustomTour.objects.create(
                customer=customer,
                status=CustomTourStatus.PENDING,
                title=title.strip(),
                destination=destination.strip(),
                start_date=start_date,
                end_date=end_date,
                travelers=travelers,
                estimated_budget=estimated_budget,
                currency=currency.strip().upper(),
                accommodation_preferences=(accommodation_preferences or "").strip(),
                transportation_preferences=(
                    transportation_preferences or ""
                ).strip(),
                preferred_activities=(preferred_activities or "").strip(),
                additional_requirements=(additional_requirements or "").strip(),
            )
            notification = self.notifications.create(
                recipient_id=customer.id,
                event_key=CUSTOM_TOUR_SUBMITTED_EVENT,
                entity_type=CUSTOM_TOUR_ENTITY_TYPE,
                entity_id=tour.id,
                payload={
                    "custom_tour_id": str(tour.id),
                    "title": tour.title,
                    "status": tour.status,
                },
            )
            if notification is None:
                raise RuntimeError(
                    "custom_tour.submitted notification was not created."
                )

            if key:
                try:
                    CustomTourSubmitIdempotency.objects.create(
                        customer=customer,
                        idempotency_key=key,
                        custom_tour=tour,
                    )
                except IntegrityError:
                    raced = self._existing_for_key(customer=customer, key=key)
                    if raced is None:
                        raise
                    return raced, False

            return tour, True

    def approve(self, *, admin, tour_id) -> CustomTour:
        """Approve PENDING custom tour; 7-day rule at approval time (Story 8.3)."""
        with transaction.atomic():
            tour = CustomTour.objects.select_for_update().get(pk=tour_id)
            if tour.status != CustomTourStatus.PENDING:
                raise CustomTourNotApprovable(
                    "Only pending custom tours can be approved."
                )
            try:
                assert_bookable_date(tour.start_date)
            except ValueError as exc:
                raise ValidationError({"detail": [str(exc)]}) from exc

            before = self._decision_snapshot(tour)
            approved_at = timezone.now()
            tour.status = CustomTourStatus.APPROVED
            tour.approved_at = approved_at
            tour.rejection_reason = ""
            tour.recommended_adjustments = ""
            tour.reapply_enabled = False
            tour.save(
                update_fields=[
                    "status",
                    "approved_at",
                    "rejection_reason",
                    "recommended_adjustments",
                    "reapply_enabled",
                    "updated_at",
                ]
            )

            self.audit.record(
                actor_id=admin.id,
                action=CUSTOM_TOUR_APPROVE_AUDIT_ACTION,
                target_type=CUSTOM_TOUR_ENTITY_TYPE,
                target_id=str(tour.id),
                before=before,
                after=self._decision_snapshot(tour),
            )
            notification = self.notifications.create(
                recipient_id=tour.customer_id,
                event_key=CUSTOM_TOUR_APPROVED_EVENT,
                entity_type=CUSTOM_TOUR_ENTITY_TYPE,
                entity_id=tour.id,
                payload={
                    "custom_tour_id": str(tour.id),
                    "title": tour.title,
                    "status": tour.status,
                },
            )
            if notification is None:
                raise RuntimeError("custom_tour.approved notification was not created.")
            return tour

    def reject(
        self,
        *,
        admin,
        tour_id,
        reason: str,
        recommended_adjustments: str = "",
        reapply_enabled: bool = False,
    ) -> CustomTour:
        """Reject PENDING custom tour with mandatory reason (Story 8.3)."""
        reason = self._clean_rejection_reason(reason)
        adjustments = self._clean_adjustments(recommended_adjustments)
        with transaction.atomic():
            tour = CustomTour.objects.select_for_update().get(pk=tour_id)
            if tour.status != CustomTourStatus.PENDING:
                raise CustomTourNotRejectable(
                    "Only pending custom tours can be rejected."
                )

            before = self._decision_snapshot(tour)
            tour.status = CustomTourStatus.REJECTED
            tour.rejection_reason = reason
            tour.recommended_adjustments = adjustments
            tour.reapply_enabled = bool(reapply_enabled)
            tour.approved_at = None
            tour.save(
                update_fields=[
                    "status",
                    "rejection_reason",
                    "recommended_adjustments",
                    "reapply_enabled",
                    "approved_at",
                    "updated_at",
                ]
            )

            self.audit.record(
                actor_id=admin.id,
                action=CUSTOM_TOUR_REJECT_AUDIT_ACTION,
                target_type=CUSTOM_TOUR_ENTITY_TYPE,
                target_id=str(tour.id),
                before=before,
                after=self._decision_snapshot(tour),
            )
            notification = self.notifications.create(
                recipient_id=tour.customer_id,
                event_key=CUSTOM_TOUR_REJECTED_EVENT,
                entity_type=CUSTOM_TOUR_ENTITY_TYPE,
                entity_id=tour.id,
                payload={
                    "custom_tour_id": str(tour.id),
                    "title": tour.title,
                    "status": tour.status,
                    "rejection_reason": reason,
                },
            )
            if notification is None:
                raise RuntimeError("custom_tour.rejected notification was not created.")

            if tour.reapply_enabled:
                reapply_notif = self.notifications.create(
                    recipient_id=tour.customer_id,
                    event_key=CUSTOM_TOUR_REAPPLY_ENABLED_EVENT,
                    entity_type=CUSTOM_TOUR_ENTITY_TYPE,
                    entity_id=tour.id,
                    payload={
                        "custom_tour_id": str(tour.id),
                        "title": tour.title,
                        "reapply_enabled": True,
                    },
                )
                if reapply_notif is None:
                    raise RuntimeError(
                        "custom_tour.reapply_enabled notification was not created."
                    )
            return tour

    def reapply(
        self,
        *,
        customer,
        tour_id,
        title: str,
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
        estimated_budget: Decimal,
        currency: str,
        accommodation_preferences: str = "",
        transportation_preferences: str = "",
        preferred_activities: str = "",
        additional_requirements: str = "",
    ) -> CustomTour:
        """Customer resubmit after rejection (Story 8.4)."""
        if end_date < start_date:
            raise ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )
        try:
            assert_bookable_date(start_date)
        except ValueError as exc:
            raise ValidationError({"start_date": [str(exc)]}) from exc
        if travelers < 1:
            raise ValidationError({"travelers": ["Enter at least 1 traveler."]})
        if estimated_budget <= 0:
            raise ValidationError(
                {"estimated_budget": ["Estimated budget must be greater than zero."]}
            )

        with transaction.atomic():
            tour = CustomTour.objects.select_for_update().get(
                pk=tour_id, customer=customer
            )
            self.assert_reapply_allowed(tour)

            decided_at = tour.updated_at
            CustomTourReview.objects.create(
                custom_tour=tour,
                cycle=tour.review_cycle,
                decision=CustomTourReviewDecision.REJECTED,
                rejection_reason=tour.rejection_reason,
                recommended_adjustments=tour.recommended_adjustments,
                decided_at=decided_at,
                admin_id=None,
            )

            tour.review_cycle += 1
            tour.status = CustomTourStatus.PENDING
            tour.title = title.strip()
            tour.destination = destination.strip()
            tour.start_date = start_date
            tour.end_date = end_date
            tour.travelers = travelers
            tour.estimated_budget = estimated_budget
            tour.currency = currency.strip().upper()
            tour.accommodation_preferences = (accommodation_preferences or "").strip()
            tour.transportation_preferences = (
                transportation_preferences or ""
            ).strip()
            tour.preferred_activities = (preferred_activities or "").strip()
            tour.additional_requirements = (additional_requirements or "").strip()
            tour.rejection_reason = ""
            tour.recommended_adjustments = ""
            tour.reapply_enabled = False
            tour.approved_at = None
            tour.save(
                update_fields=[
                    "review_cycle",
                    "status",
                    "title",
                    "destination",
                    "start_date",
                    "end_date",
                    "travelers",
                    "estimated_budget",
                    "currency",
                    "accommodation_preferences",
                    "transportation_preferences",
                    "preferred_activities",
                    "additional_requirements",
                    "rejection_reason",
                    "recommended_adjustments",
                    "reapply_enabled",
                    "approved_at",
                    "updated_at",
                ]
            )

            # entity_id includes review_cycle so each resubmit gets its own notification
            # (AD-17 unique key is event_key + entity_type + entity_id + recipient).
            notification = self.notifications.create(
                recipient_id=customer.id,
                event_key=CUSTOM_TOUR_RESUBMITTED_EVENT,
                entity_type=CUSTOM_TOUR_ENTITY_TYPE,
                entity_id=f"{tour.id}:{tour.review_cycle}",
                payload={
                    "custom_tour_id": str(tour.id),
                    "title": tour.title,
                    "status": tour.status,
                    "review_cycle": tour.review_cycle,
                },
            )
            if notification is None:
                raise RuntimeError(
                    "custom_tour.resubmitted notification was not created."
                )
            return tour

    @staticmethod
    def assert_reapply_allowed(tour: CustomTour) -> None:
        """8.4 resubmit must call this before accepting a new review cycle."""
        if tour.status != CustomTourStatus.REJECTED:
            raise CustomTourReapplyNotAllowed(
                "Only rejected custom tours can be resubmitted."
            )
        if not tour.reapply_enabled:
            raise CustomTourReapplyNotAllowed(
                "Reapplication is not enabled for this custom tour."
            )

    @staticmethod
    def _existing_for_key(*, customer, key: str) -> CustomTour | None:
        row = (
            CustomTourSubmitIdempotency.objects.filter(
                customer=customer,
                idempotency_key=key,
            )
            .select_related("custom_tour")
            .first()
        )
        return row.custom_tour if row else None

    @staticmethod
    def _decision_snapshot(tour: CustomTour) -> dict:
        return {
            "status": tour.status,
            "rejection_reason": tour.rejection_reason,
            "recommended_adjustments": tour.recommended_adjustments,
            "reapply_enabled": tour.reapply_enabled,
            "approved_at": tour.approved_at.isoformat() if tour.approved_at else None,
        }

    @staticmethod
    def _clean_rejection_reason(reason: str | None) -> str:
        cleaned = (reason or "").strip()
        if not cleaned:
            raise ValidationError(
                {
                    "rejection_reason": [
                        "Enter a reason for rejecting this custom tour."
                    ]
                }
            )
        if len(cleaned) > REJECTION_REASON_MAX_LENGTH:
            raise ValidationError(
                {
                    "rejection_reason": [
                        "Reason must be "
                        f"{REJECTION_REASON_MAX_LENGTH} characters or fewer."
                    ]
                }
            )
        return cleaned

    @staticmethod
    def _clean_adjustments(value: str | None) -> str:
        cleaned = (value or "").strip()
        if len(cleaned) > ADJUSTMENTS_MAX_LENGTH:
            raise ValidationError(
                {
                    "recommended_adjustments": [
                        "Adjustments must be "
                        f"{ADJUSTMENTS_MAX_LENGTH} characters or fewer."
                    ]
                }
            )
        return cleaned