"""NotificationService — exclusive writer of in-app notifications (AD-17)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from django.db import IntegrityError, transaction

from notifications.models import Notification

# Closed MVP catalog (AD-17). Extend only by amending the architecture AD.
MVP_EVENT_KEYS = frozenset(
    {
        "booking.submitted",
        "booking.approved",
        "booking.rejected",
        "booking.cancelled",
        "payment.success",
        "payment.failed",
        "payment.window_expired",
        "custom_tour.submitted",
        "custom_tour.approved",
        "custom_tour.rejected",
    }
)


class NotificationService:
    """Persists notifications with idempotent create on the AD-17 unique key."""

    def create(
        self,
        *,
        recipient_id: UUID,
        event_key: str,
        payload: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
        entity_type: str | None = None,
        entity_id: UUID | str | None = None,
    ) -> Notification:
        """Create or return the existing row for the idempotency identity.

        Unique identity: ``(event_key, entity_type, entity_id, recipient_id)``.
        ``idempotency_key`` remains accepted for callers that already pass it;
        when ``entity_type`` / ``entity_id`` are omitted, ``idempotency_key`` is
        used as ``entity_id`` with ``entity_type="idempotency"``.
        """
        if event_key not in MVP_EVENT_KEYS:
            raise ValueError(f"Unknown notification event_key: {event_key!r}")

        resolved_type, resolved_id = self._resolve_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            idempotency_key=idempotency_key,
        )

        try:
            with transaction.atomic():
                return Notification.objects.create(
                    recipient_id=recipient_id,
                    event_key=event_key,
                    entity_type=resolved_type,
                    entity_id=resolved_id,
                    payload=payload or {},
                )
        except IntegrityError:
            existing = Notification.objects.filter(
                recipient_id=recipient_id,
                event_key=event_key,
                entity_type=resolved_type,
                entity_id=resolved_id,
            ).first()
            if existing is None:
                raise
            return existing

    def mark_read(self, *, notification_id: UUID, recipient_id: UUID) -> None:
        updated = Notification.objects.filter(
            id=notification_id,
            recipient_id=recipient_id,
        ).update(is_read=True)
        if updated == 0:
            raise Notification.DoesNotExist(
                f"Notification {notification_id} not found for recipient."
            )

    @staticmethod
    def _resolve_entity(
        *,
        entity_type: str | None,
        entity_id: UUID | str | None,
        idempotency_key: str | None,
    ) -> tuple[str, str]:
        if entity_type and entity_id is not None:
            return entity_type, str(entity_id)
        if idempotency_key:
            return "idempotency", str(idempotency_key)
        raise ValueError(
            "NotificationService.create requires entity_type+entity_id "
            "or idempotency_key."
        )
