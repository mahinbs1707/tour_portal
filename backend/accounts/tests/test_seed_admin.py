"""seed_admin management command tests."""

from __future__ import annotations

import io
import os
from contextlib import redirect_stderr, redirect_stdout

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from accounts.models import Role, User


class SeedAdminCommandTests(TestCase):
    def setUp(self):
        self._env_keys = ("ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_FULL_NAME")
        self._prior = {key: os.environ.get(key) for key in self._env_keys}
        for key in self._env_keys:
            os.environ.pop(key, None)

    def tearDown(self):
        for key in self._env_keys:
            os.environ.pop(key, None)
        for key, value in self._prior.items():
            if value is not None:
                os.environ[key] = value

    def _assert_fail_closed(self):
        with self.assertRaises(CommandError) as ctx:
            call_command("seed_admin")
        message = str(ctx.exception)
        self.assertIn("ADMIN_EMAIL", message)
        self.assertIn("ADMIN_PASSWORD", message)
        self.assertEqual(User.objects.count(), 0)

    def test_fail_closed_when_env_missing(self):
        self._assert_fail_closed()

    def test_fail_closed_email_only(self):
        os.environ["ADMIN_EMAIL"] = "only-email@example.com"
        self._assert_fail_closed()

    def test_fail_closed_password_only(self):
        os.environ["ADMIN_PASSWORD"] = "OnlyPass12"
        self._assert_fail_closed()

    def test_fail_closed_whitespace_only_password(self):
        os.environ["ADMIN_EMAIL"] = "ws@example.com"
        os.environ["ADMIN_PASSWORD"] = "   "
        self._assert_fail_closed()

    def test_seeds_admin_with_hashed_password(self):
        password = "AdminSeedPass1"
        os.environ["ADMIN_EMAIL"] = "seed-admin@example.com"
        os.environ["ADMIN_PASSWORD"] = password

        out = io.StringIO()
        err = io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            call_command("seed_admin", stdout=out, stderr=err)

        user = User.objects.get(email="seed-admin@example.com")
        self.assertEqual(user.role, Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password(password))
        self.assertNotEqual(user.password, password)
        combined = out.getvalue() + err.getvalue()
        self.assertNotIn(password, combined)

    def test_idempotent_upsert_updates_full_name(self):
        os.environ["ADMIN_EMAIL"] = "upsert@example.com"
        os.environ["ADMIN_PASSWORD"] = "FirstPass12"
        os.environ["ADMIN_FULL_NAME"] = "First Admin"
        call_command("seed_admin")
        first_id = User.objects.get(email="upsert@example.com").id
        self.assertEqual(User.objects.get(email="upsert@example.com").full_name, "First Admin")

        os.environ["ADMIN_PASSWORD"] = "SecondPass34"
        os.environ["ADMIN_FULL_NAME"] = "Updated Admin"
        call_command("seed_admin")

        user = User.objects.get(email="upsert@example.com")
        self.assertEqual(User.objects.filter(email="upsert@example.com").count(), 1)
        self.assertEqual(user.id, first_id)
        self.assertEqual(user.role, Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.full_name, "Updated Admin")
        self.assertTrue(user.check_password("SecondPass34"))
        self.assertFalse(user.check_password("FirstPass12"))
