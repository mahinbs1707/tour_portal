"""In-app notifications (AD-12 / AD-17)."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Persisted in-app notification. Inserts only via NotificationService."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_key = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=64, db_index=True)
    entity_id = models.CharField(max_length=64, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["event_key", "entity_type", "entity_id", "recipient"],
                name="uniq_notification_idempotency",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.event_key}:{self.entity_type}:{self.entity_id}"
