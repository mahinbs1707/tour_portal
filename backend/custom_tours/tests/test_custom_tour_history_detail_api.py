"""Custom tour list/detail API (Story 8.2)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from custom_tours.models import CustomTour, CustomTourStatus
from custom_tours.services import CustomTourService
from packages.validators import min_bookable_date, today_in_business_tz

User = get_user_model()


class CustomTourHistoryDetailAPITests(APITestCase):
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
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="SecurePass1",
            full_name="Other Customer",
            role=Role.CUSTOMER,
        )
        self.as_of = today_in_business_tz()
        start = min_bookable_date(as_of=self.as_of)
        end = start + timedelta(days=3)

        self.tour_a = CustomTourService().create(
            customer=self.customer,
            title="Trip A",
            destination="Sylhet",
            start_date=start,
            end_date=end,
            travelers=2,
            estimated_budget=Decimal("50000"),
            currency="BDT",
        )[0]
        self.tour_b = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.REJECTED,
            title="Trip B",
            destination="Cox",
            start_date=start,
            end_date=end,
            travelers=1,
            estimated_budget=Decimal("30000"),
            currency="BDT",
            rejection_reason="Dates no longer available.",
            recommended_adjustments="Shift start by one week.",
        )
        # Deterministic newest-first: tour_a older than tour_b.
        CustomTour.objects.filter(pk=self.tour_a.pk).update(
            created_at=timezone.now() - timedelta(days=1)
        )
        self.tour_a.refresh_from_db()
        self.foreign = CustomTour.objects.create(
            customer=self.other,
            status=CustomTourStatus.PENDING,
            title="Foreign",
            destination="Dhaka",
            start_date=start,
            end_date=end,
            travelers=1,
            estimated_budget=Decimal("10000"),
            currency="BDT",
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

    def test_list_returns_own_newest_first_with_statuses(self):
        self._login()
        response = self.client.get("/api/custom-tours/", **self._headers())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(len(body), 2)
        self.assertEqual(body[0]["id"], str(self.tour_b.id))
        self.assertEqual(body[0]["status"], CustomTourStatus.REJECTED)
        self.assertEqual(body[1]["id"], str(self.tour_a.id))

    def test_detail_includes_rejection_fields_when_present(self):
        self._login()
        response = self.client.get(
            f"/api/custom-tours/{self.tour_b.id}/",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["rejection_reason"], "Dates no longer available.")
        self.assertEqual(body["recommended_adjustments"], "Shift start by one week.")

    def test_foreign_detail_is_404(self):
        self._login()
        response = self.client.get(
            f"/api/custom-tours/{self.foreign.id}/",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_list_denied(self):
        response = self.client.get("/api/custom-tours/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )