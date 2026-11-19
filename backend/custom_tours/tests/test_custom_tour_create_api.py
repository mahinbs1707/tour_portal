"""Custom tour create API matrix (Story 8.1)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from custom_tours.models import CustomTour, CustomTourStatus
from notifications.models import Notification
from notifications.services import NotificationService
from packages.validators import min_bookable_date, today_in_business_tz

User = get_user_model()


class CustomTourCreateAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.other_customer = User.objects.create_user(
            email="other@example.com",
            password="SecurePass1",
            full_name="Other Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.as_of = today_in_business_tz()
        self.min_start = min_bookable_date(as_of=self.as_of)
        self.start_date = self.min_start + timedelta(days=2)
        self.end_date = self.start_date + timedelta(days=3)
        self.too_soon = self.as_of + timedelta(days=2)

    def _headers(self, *, idempotency_key: str | None = None):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        headers = {"HTTP_X_CSRFTOKEN": token}
        if idempotency_key:
            headers["HTTP_IDEMPOTENCY_KEY"] = idempotency_key
        return headers

    def _login(self, email="customer@example.com", password="SecurePass1"):
        response = self.client.post(
            "/api/auth/login/",
            {"email": email, "password": password},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _valid_payload(self, **overrides):
        payload = {
            "title": "Hill Country Adventure",
            "destination": "Bandarban, Rangamati",
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "travelers": 4,
            "estimated_budget": "150000.00",
            "currency": "bdt",
            "accommodation_preferences": "Eco lodges",
            "transportation_preferences": "Private car",
            "preferred_activities": "Trekking",
            "additional_requirements": "Halal meals",
        }
        payload.update(overrides)
        return payload

    def test_happy_path_pending_and_notification(self):
        self._login()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["status"], CustomTourStatus.PENDING)
        self.assertEqual(body["currency"], "BDT")

        tour = CustomTour.objects.get(pk=body["id"])
        self.assertEqual(tour.customer_id, self.customer.id)

        notif = Notification.objects.get(
            event_key="custom_tour.submitted",
            entity_type="custom_tour",
            entity_id=str(tour.id),
            recipient_id=self.customer.id,
        )
        self.assertIsNotNone(notif)

    def test_start_within_seven_days_rejected_no_row_no_notification(self):
        self._login()
        before_count = CustomTour.objects.count()
        before_notif = Notification.objects.count()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(
                start_date=self.too_soon.isoformat(),
                end_date=(self.too_soon + timedelta(days=2)).isoformat(),
            ),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_date", response.json())
        self.assertEqual(CustomTour.objects.count(), before_count)
        self.assertEqual(Notification.objects.count(), before_notif)

    def test_end_before_start_rejected(self):
        self._login()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(
                start_date=self.start_date.isoformat(),
                end_date=(self.start_date - timedelta(days=1)).isoformat(),
            ),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            "end_date" in response.json() or "non_field_errors" in response.json()
        )

    def test_guest_receives_403(self):
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertEqual(CustomTour.objects.count(), 0)

    def test_notification_idempotent_on_duplicate_create(self):
        self._login()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        tour_id = response.json()["id"]
        service = NotificationService()
        with transaction.atomic():
            service.create(
                recipient_id=self.customer.id,
                event_key="custom_tour.submitted",
                entity_type="custom_tour",
                entity_id=tour_id,
                payload={"custom_tour_id": tour_id},
            )
        self.assertEqual(
            Notification.objects.filter(
                event_key="custom_tour.submitted",
                entity_id=str(tour_id),
                recipient_id=self.customer.id,
            ).count(),
            1,
        )

    def test_idempotency_key_replays_same_tour(self):
        self._login()
        key = "idem-8-1-abc"
        first = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(),
            format="json",
            **self._headers(idempotency_key=key),
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        first_id = first.json()["id"]

        second = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(title="Different title"),
            format="json",
            **self._headers(idempotency_key=key),
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.json()["id"], first_id)
        self.assertEqual(CustomTour.objects.filter(customer=self.customer).count(), 1)
        self.assertEqual(
            Notification.objects.filter(
                event_key="custom_tour.submitted",
                entity_id=first_id,
            ).count(),
            1,
        )

    def test_travelers_zero_rejected(self):
        self._login()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(travelers=0),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_budget_non_positive_rejected(self):
        self._login()
        response = self.client.post(
            "/api/custom-tours/",
            self._valid_payload(estimated_budget="0"),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)