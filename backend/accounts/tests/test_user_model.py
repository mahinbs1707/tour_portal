"""User model role/staff matrix tests (AD-3 / AD-19)."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounts.models import Role, User


class UserRoleStaffMatrixTests(TestCase):
    def test_valid_admin_matrix(self):
        user = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            role=Role.ADMIN,
            is_staff=True,
            full_name="Admin",
        )
        self.assertEqual(user.role, Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password("SecurePass1"))
        self.assertNotEqual(user.password, "SecurePass1")

    def test_valid_customer_matrix(self):
        user = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            role=Role.CUSTOMER,
            is_staff=False,
            full_name="Customer",
        )
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertFalse(user.is_staff)

    def test_rejects_admin_without_staff(self):
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="bad-admin@example.com",
                password="SecurePass1",
                role=Role.ADMIN,
                is_staff=False,
            )

    def test_rejects_customer_with_staff(self):
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="bad-customer@example.com",
                password="SecurePass1",
                role=Role.CUSTOMER,
                is_staff=True,
            )

    def test_email_normalized_unique(self):
        User.objects.create_user(
            email="Person@Example.COM",
            password="SecurePass1",
            full_name="Person",
        )
        self.assertTrue(User.objects.filter(email="person@example.com").exists())
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="person@example.com",
                password="SecurePass1",
                full_name="Duplicate",
            )
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="PERSON@example.com",
                password="SecurePass1",
                full_name="Different Case",
            )

    def test_create_superuser_requires_is_superuser(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="super@example.com",
                password="SecurePass1",
                full_name="Super",
                is_superuser=False,
            )
