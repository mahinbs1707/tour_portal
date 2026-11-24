"""Password reset request + confirm (mock delivery when DEBUG)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role

User = get_user_model()


class PasswordResetAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.csrf = self.client.cookies.get("csrftoken").value
        self.user = User.objects.create_user(
            email="resetme@example.com",
            password="OldPass12",
            full_name="Reset Me",
            role=Role.CUSTOMER,
        )

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf
        return {"HTTP_X_CSRFTOKEN": token}

    @override_settings(DEBUG=True)
    def test_request_returns_mock_link_for_existing_user(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": "resetme@example.com"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertIn("mock_reset_path", response.data)
        self.assertTrue(response.data["mock_reset_path"].startswith("/reset-password?"))

    @override_settings(DEBUG=True)
    def test_request_unknown_email_has_no_mock_link(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": "nobody@example.com"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("mock_reset_path", response.data)

    def test_confirm_updates_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "password": "NewPass99",
                "confirm_password": "NewPass99",
            },
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass99"))

    def test_confirm_rejects_bad_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": "not-a-valid-token",
                "password": "NewPass99",
                "confirm_password": "NewPass99",
            },
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass12"))
