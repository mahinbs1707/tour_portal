from __future__ import annotations

import uuid

from django.test import SimpleTestCase

from notifications.services import NotificationService


class NotificationServiceStubTests(SimpleTestCase):
    def test_create_is_noop(self):
        service = NotificationService()
        self.assertIsNone(
            service.create(
                recipient_id=uuid.uuid4(),
                event_key="booking.submitted",
                payload={"ref": "x"},
                idempotency_key="k1",
            )
        )
