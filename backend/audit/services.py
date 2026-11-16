"""AuditService — exclusive writer of administrative audit rows (AD-4 / AD-22)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from audit.models import AuditLog


class AuditService:
    """Persists audit rows. Callers must invoke inside the same atomic block as the change."""

    def record(
        self,
        *,
        actor_id: UUID,
        action: str,
        target_type: str,
        target_id: str,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
    ) -> AuditLog:
        return AuditLog.objects.create(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            before=before,
            after=after,
        )
