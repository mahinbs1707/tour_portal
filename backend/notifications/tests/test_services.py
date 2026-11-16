"""NotificationService persistence + idempotency (Story 5.1 / AD-17)."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Role
from notifications.models import Notification
from notifications.services import NotificationService

User = get_user_model()


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="notify@example.com",
            password="SecurePass1",
            full_name="Notify User",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.service = NotificationService()
        self.booking_id = uuid.uuid4()

    def test_create_persists_notification(self):
        notif = self.service.create(
            recipient_id=self.user.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=self.booking_id,
            payload={"ref": "ABCDEF123456"},
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.event_key, "booking.submitted")
        self.assertFalse(notif.is_read)
        self.assertEqual(Notification.objects.count(), 1)

    def test_create_is_idempotent(self):
        first = self.service.create(
            recipient_id=self.user.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=self.booking_id,
            payload={"ref": "A"},
        )
        second = self.service.create(
            recipient_id=self.user.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=self.booking_id,
            payload={"ref": "B"},
        )
        self.assertEqual(first.id, second.id)
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(first.payload["ref"], "A")

    def test_unknown_event_key_rejected(self):
        with self.assertRaises(ValueError):
            self.service.create(
                recipient_id=self.user.id,
                event_key="booking.invented",
                entity_type="booking",
                entity_id=self.booking_id,
            )
