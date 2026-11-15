"""Idempotent Admin seed from ADMIN_EMAIL / ADMIN_PASSWORD (AD-3 / AD-19).

Passwords are never written to stdout/stderr or logs.
"""

from __future__ import annotations

import os

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from accounts.models import Role, User, validate_role_staff_matrix


class Command(BaseCommand):
    help = (
        "Upsert an Admin user from ADMIN_EMAIL and ADMIN_PASSWORD. "
        "Sets role=ADMIN, is_staff=True, is_superuser=False. Fail-closed if env missing."
    )

    def handle(self, *args, **options):
        email_raw = (os.environ.get("ADMIN_EMAIL") or "").strip()
        password = os.environ.get("ADMIN_PASSWORD") or ""

        if not email_raw or not password.strip():
            raise CommandError(
                "ADMIN_EMAIL and ADMIN_PASSWORD must both be set (non-empty) "
                "to run seed_admin. Fail closed — no Admin seeded."
            )

        email = User.objects.normalize_email(email_raw)
        role = Role.ADMIN
        is_staff = True
        is_superuser = False
        full_name_env = (os.environ.get("ADMIN_FULL_NAME") or "").strip()

        # Validate matrix before any write (also enforced on User.save).
        validate_role_staff_matrix(role=role, is_staff=is_staff)

        def apply_admin_fields(user: User) -> None:
            user.role = role
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.is_active = True
            if full_name_env:
                user.full_name = full_name_env
            user.set_password(password)

        user = User.objects.filter(email=email).first()
        if user is None:
            try:
                with transaction.atomic():
                    user = User(
                        email=email,
                        full_name=full_name_env or "Admin",
                        role=role,
                        is_staff=is_staff,
                        is_superuser=is_superuser,
                        is_active=True,
                    )
                    user.set_password(password)
                    user.save()
                # Never interpolate password into messages.
                self.stdout.write(self.style.SUCCESS(f"Created Admin user {email}"))
                return
            except IntegrityError:
                user = User.objects.get(email=email)

        apply_admin_fields(user)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Updated Admin user {email}"))
