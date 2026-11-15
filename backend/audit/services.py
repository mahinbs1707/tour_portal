"""AuditService stub (AD-4 / AD-12).

Exclusive writer of administrative audit rows once the closed catalog lands.
Story 1.3: interface only — no persistence / no domain event emission.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID


class AuditService:
    """Injectable stub. Callers may depend on this API; writes are not-yet."""

    def record(
        self,
        *,
        actor_id: UUID,
        action: str,
        target_type: str,
        target_id: str,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
    ) -> None:
        """Record-not-yet: no audit row is created in Story 1.3."""
        return None
