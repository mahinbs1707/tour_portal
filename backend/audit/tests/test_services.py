from __future__ import annotations

import uuid

from django.test import TestCase

from audit.models import AuditLog
from audit.services import AuditService


class AuditServiceTests(TestCase):
    def test_record_persists_row(self):
        actor_id = uuid.uuid4()
        target_id = str(uuid.uuid4())
        service = AuditService()
        row = service.record(
            actor_id=actor_id,
            action="package.create",
            target_type="package",
            target_id=target_id,
            before=None,
            after={"status": "DRAFT"},
        )
        self.assertIsInstance(row, AuditLog)
        self.assertEqual(AuditLog.objects.count(), 1)
        saved = AuditLog.objects.get()
        self.assertEqual(saved.actor_id, actor_id)
        self.assertEqual(saved.action, "package.create")
        self.assertEqual(saved.target_type, "package")
        self.assertEqual(saved.target_id, target_id)
        self.assertIsNone(saved.before)
        self.assertEqual(saved.after, {"status": "DRAFT"})
