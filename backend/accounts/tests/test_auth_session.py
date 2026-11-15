"""Login / logout / me API matrix (Story 1.5)."""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from accounts.serializers import INVALID_CREDENTIALS_MESSAGE

User = get_user_model()


class AuthSessionAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf_response = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value
        self.assertIs(settings.SESSION_COOKIE_HTTPONLY, True)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")
        # Import-time policy (AD-2): Secure when DJANGO_DEBUG!=1.
        # Do not use settings.DEBUG — the test runner forces DEBUG=False.
        expect_secure = os.environ.get("DJANGO_DEBUG", "0") != "1"
        self.assertEqual(settings.SESSION_COOKIE_SECURE, expect_secure)
        self.assertEqual(settings.CSRF_COOKIE_SECURE, expect_secure)
        self.assertIs(settings.CSRF_COOKIE_HTTPONLY, False)

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            full_name="Ada Admin",
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=False,
        )

    def _post(self, path, payload=None, *, include_csrf=True, client=None):
        client = client or self.client
        headers = {}
        if include_csrf:
            # Prefer the live cookie — Django may rotate csrftoken on login.
            cookie = client.cookies.get("csrftoken")
            token = cookie.value if cookie else self.csrf_token
            headers["HTTP_X_CSRFTOKEN"] = token
        return client.post(path, payload or {}, format="json", **headers)

    def test_customer_login_sets_session_and_me_shape(self):
        response = self._post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "customer@example.com")
        self.assertEqual(response.data["role"], Role.CUSTOMER)
        self.assertFalse(response.data["is_staff"])
        self.assertFalse(response.data["is_superuser"])
        self.assertNotIn("password", response.data)
        self.assertIn("_auth_user_id", self.client.session)

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["role"], Role.CUSTOMER)
        self.assertFalse(me.data["is_staff"])
        self.assertFalse(me.data["is_superuser"])

    def test_admin_login_sets_session_and_me_shape(self):
        response = self._post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "SecurePass1"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.ADMIN)
        self.assertTrue(response.data["is_staff"])
        self.assertFalse(response.data["is_superuser"])

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["role"], Role.ADMIN)
        self.assertTrue(me.data["is_staff"])
        self.assertFalse(me.data["is_superuser"])

    def test_invalid_credentials_generic_and_no_session(self):
        response = self._post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "WrongPass1"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # DRF ValidationError on non_field → list under non_field_errors
        detail = response.data.get("non_field_errors") or response.data.get("detail")
        if isinstance(detail, list):
            self.assertIn(INVALID_CREDENTIALS_MESSAGE, detail)
        else:
            self.assertEqual(detail, INVALID_CREDENTIALS_MESSAGE)
        self.assertNotIn("_auth_user_id", self.client.session)

        unknown = self._post(
            "/api/auth/login/",
            {"email": "nobody@example.com", "password": "SecurePass1"},
        )
        self.assertEqual(unknown.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_logout_invalidates_session(self):
        self._post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
        )
        self.assertIn("_auth_user_id", self.client.session)

        logout_response = self._post("/api/auth/logout/")
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertNotIn("_auth_user_id", self.client.session)

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_unauthenticated_denied(self):
        me = self.client.get("/api/auth/me/")
        self.assertIn(
            me.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_login_requires_csrf(self):
        bare = APIClient(enforce_csrf_checks=True)
        response = bare.post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST),
        )
        self.assertNotIn("_auth_user_id", bare.session)

    def test_logout_requires_csrf(self):
        self._post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
        )
        self.assertIn("_auth_user_id", self.client.session)

        response = self._post("/api/auth/logout/", include_csrf=False)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST),
        )
        self.assertIn("_auth_user_id", self.client.session)

    def test_inactive_user_login_generic_denial(self):
        self.customer.is_active = False
        self.customer.save()
        response = self._post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        detail = response.data.get("non_field_errors") or response.data.get("detail")
        if isinstance(detail, list):
            self.assertIn(INVALID_CREDENTIALS_MESSAGE, detail)
        else:
            self.assertEqual(detail, INVALID_CREDENTIALS_MESSAGE)
        self.assertNotIn("_auth_user_id", self.client.session)
