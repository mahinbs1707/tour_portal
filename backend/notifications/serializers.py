"""Notification read serializers (Story 9.1)."""

from __future__ import annotations

from rest_framework import serializers

from notifications.catalog import format_notification_message, resolve_customer_deeplink
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()
    deeplink = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "event_key",
            "message",
            "entity_type",
            "entity_id",
            "payload",
            "is_read",
            "created_at",
            "deeplink",
        ]
        read_only_fields = fields

    def get_message(self, obj: Notification) -> str:
        return format_notification_message(
            event_key=obj.event_key,
            payload=obj.payload,
        )

    def get_deeplink(self, obj: Notification) -> str | None:
        return resolve_customer_deeplink(
            event_key=obj.event_key,
            entity_type=obj.entity_type,
            entity_id=obj.entity_id,
            payload=obj.payload,
        )