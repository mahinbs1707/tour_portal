"""NotificationService stub (AD-4 / AD-12).

Exclusive writer of in-app notification rows once domain events land.
Story 1.3: interface only — no persistence / no domain event emission.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID


class NotificationService:
    """Injectable stub. Callers may depend on this API; writes are not-yet."""

    def create(
        self,
        *,
        recipient_id: UUID,
        event_key: str,
        payload: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> None:
        """Record-not-yet: no Notification row is created in Story 1.3."""
        return None

    def mark_read(self, *, notification_id: UUID, recipient_id: UUID) -> None:
        """Record-not-yet: no read-state update in Story 1.3."""
        return None
