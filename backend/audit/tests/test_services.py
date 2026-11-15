from __future__ import annotations

import uuid

from django.test import SimpleTestCase

from audit.services import AuditService


class AuditServiceStubTests(SimpleTestCase):
    def test_record_is_noop(self):
        service = AuditService()
        self.assertIsNone(
            service.record(
                actor_id=uuid.uuid4(),
                action="booking.approve",
                target_type="booking",
                target_id=str(uuid.uuid4()),
                before={"status": "PENDING"},
                after={"status": "APPROVED"},
            )
        )
