"""Notification inbox APIs (Story 9.1)."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from notifications.models import Notification
from notifications.services import NotificationService

User = get_user_model()


class NotificationInboxAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.csrf_token = self.client.cookies.get("csrftoken").value

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="SecurePass1",
            full_name="Other Customer",
            role=Role.CUSTOMER,
        )
        self.booking_id = uuid.uuid4()
        self.service = NotificationService()
        self.notif = self.service.create(
            recipient_id=self.customer.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=str(self.booking_id),
            payload={"reference": "BR-001"},
        )
        self.other_notif = self.service.create(
            recipient_id=self.other.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=str(uuid.uuid4()),
            payload={"reference": "BR-OTHER"},
        )

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login(self, email="customer@example.com"):
        response = self.client.post(
            "/api/auth/login/",
            {"email": email, "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_returns_only_own_notifications_with_message_and_deeplink(self):
        self._login()
        response = self.client.get("/api/notifications/", **self._headers())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], str(self.notif.id))
        self.assertIn("BR-001", body[0]["message"])
        self.assertEqual(
            body[0]["deeplink"],
            f"/app/customer/bookings/{self.booking_id}",
        )
        self.assertFalse(body[0]["is_read"])

    def test_unread_count(self):
        self._login()
        response = self.client.get(
            "/api/notifications/unread-count/",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 1)

    def test_mark_read_persists(self):
        self._login()
        response = self.client.post(
            f"/api/notifications/{self.notif.id}/read/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["is_read"])
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_unread_count_zero_after_mark_read(self):
        self._login()
        self.client.post(
            f"/api/notifications/{self.notif.id}/read/",
            {},
            format="json",
            **self._headers(),
        )
        response = self.client.get(
            "/api/notifications/unread-count/",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 0)

    def test_mark_read_foreign_notification_404(self):
        self._login(email="other@example.com")
        response = self.client.post(
            f"/api/notifications/{self.notif.id}/read/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.notif.refresh_from_db()
        self.assertFalse(self.notif.is_read)

    def test_guest_list_denied(self):
        response = self.client.get("/api/notifications/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )