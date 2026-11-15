"""Customer registration API matrix (Story 1.4)."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role

User = get_user_model()


class RegisterAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        # Bootstrap CSRF cookie the same way the SPA will.
        csrf_response = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value
        self.assertIs(settings.CSRF_COOKIE_HTTPONLY, False)

    def _post_register(self, payload, *, include_csrf=True):
        headers = {}
        if include_csrf:
            headers["HTTP_X_CSRFTOKEN"] = self.csrf_token
        return self.client.post(
            "/api/auth/register/",
            payload,
            format="json",
            **headers,
        )

    def test_happy_path_creates_customer_and_session(self):
        response = self._post_register(
            {
                "full_name": "Alex Traveler",
                "email": "alex@example.com",
                "password": "SecurePass1",
                "confirm_password": "SecurePass1",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "alex@example.com")
        self.assertEqual(response.data["full_name"], "Alex Traveler")
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        self.assertNotIn("password", response.data)

        user = User.objects.get(email="alex@example.com")
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password("SecurePass1"))
        self.assertNotEqual(user.password, "SecurePass1")

        # Session established (HttpOnly sessionid cookie / authenticated client).
        self.assertIn("_auth_user_id", self.client.session)
        self.assertEqual(
            str(self.client.session["_auth_user_id"]),
            str(user.pk),
        )

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            email="taken@example.com",
            password="SecurePass1",
            full_name="Existing",
        )
        before = User.objects.count()
        response = self._post_register(
            {
                "full_name": "New User",
                "email": "Taken@Example.com",
                "password": "SecurePass1",
                "confirm_password": "SecurePass1",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), before)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_weak_password_rejected(self):
        before = User.objects.count()
        response = self._post_register(
            {
                "full_name": "Weak Pass",
                "email": "weak@example.com",
                "password": "short1",
                "confirm_password": "short1",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertEqual(User.objects.count(), before)
        self.assertNotIn("_auth_user_id", self.client.session)

        response_letters_only = self._post_register(
            {
                "full_name": "Weak Pass",
                "email": "weak2@example.com",
                "password": "abcdefgh",
                "confirm_password": "abcdefgh",
            }
        )
        self.assertEqual(response_letters_only.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response_letters_only.data)

        response_numbers_only = self._post_register(
            {
                "full_name": "Weak Pass",
                "email": "weak3@example.com",
                "password": "12345678",
                "confirm_password": "12345678",
            }
        )
        self.assertEqual(response_numbers_only.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response_numbers_only.data)

    def test_confirm_mismatch_rejected(self):
        before = User.objects.count()
        response = self._post_register(
            {
                "full_name": "Mismatch",
                "email": "mismatch@example.com",
                "password": "SecurePass1",
                "confirm_password": "SecurePass2",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)
        self.assertEqual(User.objects.count(), before)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_role_injection_still_creates_customer(self):
        response = self._post_register(
            {
                "full_name": "Would Be Admin",
                "email": "notadmin@example.com",
                "password": "SecurePass1",
                "confirm_password": "SecurePass1",
                "role": "ADMIN",
                "is_staff": True,
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="notadmin@example.com")
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertEqual(response.data["role"], Role.CUSTOMER)

    def test_register_requires_csrf(self):
        # Fresh client without CSRF header.
        bare = APIClient(enforce_csrf_checks=True)
        response = bare.post(
            "/api/auth/register/",
            {
                "full_name": "No CSRF",
                "email": "nocsrf@example.com",
                "password": "SecurePass1",
                "confirm_password": "SecurePass1",
            },
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST),
        )
        self.assertFalse(User.objects.filter(email="nocsrf@example.com").exists())
