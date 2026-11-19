"""Customer custom tour reapply API (Story 8.4)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from custom_tours.models import (
    CustomTour,
    CustomTourReview,
    CustomTourReviewDecision,
    CustomTourStatus,
)
from notifications.models import Notification
from packages.validators import min_bookable_date, today_in_business_tz

User = get_user_model()


class CustomTourReapplyAPITests(APITestCase):
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
        self.as_of = today_in_business_tz()
        self.valid_start = min_bookable_date(as_of=self.as_of) + timedelta(days=2)
        self.end_date = self.valid_start + timedelta(days=3)
        self.too_soon = self.as_of + timedelta(days=2)

        self.rejected = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.REJECTED,
            title="Old title",
            destination="Sylhet",
            start_date=self.valid_start,
            end_date=self.end_date,
            travelers=2,
            estimated_budget=Decimal("50000"),
            currency="BDT",
            rejection_reason="Dates conflict.",
            recommended_adjustments="Try March.",
            reapply_enabled=True,
            review_cycle=1,
        )
        self.rejected_disabled = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.REJECTED,
            title="No reapply",
            destination="Dhaka",
            start_date=self.valid_start,
            end_date=self.end_date,
            travelers=1,
            estimated_budget=Decimal("10000"),
            currency="BDT",
            rejection_reason="Budget low.",
            reapply_enabled=False,
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

    def _payload(self, **overrides):
        payload = {
            "title": "Revised Hill Trek",
            "destination": "Bandarban",
            "start_date": self.valid_start.isoformat(),
            "end_date": self.end_date.isoformat(),
            "travelers": 3,
            "estimated_budget": "120000.00",
            "currency": "BDT",
            "accommodation_preferences": "Lodges",
            "transportation_preferences": "",
            "preferred_activities": "",
            "additional_requirements": "",
        }
        payload.update(overrides)
        return payload

    def test_reapply_happy_path_pending_history_notification(self):
        self._login()
        response = self.client.post(
            f"/api/custom-tours/{self.rejected.id}/reapply/",
            self._payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["status"], CustomTourStatus.PENDING)
        self.assertEqual(body["title"], "Revised Hill Trek")
        self.assertEqual(body["rejection_reason"], "")
        self.assertFalse(body["reapply_enabled"])
        self.assertEqual(body["review_cycle"], 2)
        self.assertEqual(len(body["review_history"]), 1)
        hist = body["review_history"][0]
        self.assertEqual(hist["cycle"], 1)
        self.assertEqual(hist["decision"], CustomTourReviewDecision.REJECTED)
        self.assertEqual(hist["rejection_reason"], "Dates conflict.")
        self.assertEqual(hist["recommended_adjustments"], "Try March.")

        self.rejected.refresh_from_db()
        self.assertEqual(self.rejected.status, CustomTourStatus.PENDING)
        self.assertEqual(CustomTourReview.objects.filter(custom_tour=self.rejected).count(), 1)

        self.assertTrue(
            Notification.objects.filter(
                event_key="custom_tour.resubmitted",
                entity_id=f"{self.rejected.id}:2",
            ).exists()
        )

    def test_second_reapply_emits_new_resubmitted_notification(self):
        """Each review cycle gets its own resubmitted notification identity."""
        self._login()
        first = self.client.post(
            f"/api/custom-tours/{self.rejected.id}/reapply/",
            self._payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.rejected.refresh_from_db()
        self.rejected.status = CustomTourStatus.REJECTED
        self.rejected.rejection_reason = "Still not viable."
        self.rejected.recommended_adjustments = ""
        self.rejected.reapply_enabled = True
        self.rejected.save(
            update_fields=[
                "status",
                "rejection_reason",
                "recommended_adjustments",
                "reapply_enabled",
                "updated_at",
            ]
        )
        second = self.client.post(
            f"/api/custom-tours/{self.rejected.id}/reapply/",
            self._payload(title="Third attempt"),
            format="json",
            **self._headers(),
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.json()["review_cycle"], 3)
        resubmitted = Notification.objects.filter(
            event_key="custom_tour.resubmitted",
            recipient=self.customer,
        ).order_by("created_at")
        self.assertEqual(resubmitted.count(), 2)
        self.assertEqual(resubmitted[0].entity_id, f"{self.rejected.id}:2")
        self.assertEqual(resubmitted[1].entity_id, f"{self.rejected.id}:3")

    def test_reapply_disabled_returns_403(self):
        self._login()
        response = self.client.post(
            f"/api/custom-tours/{self.rejected_disabled.id}/reapply/",
            self._payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.rejected_disabled.refresh_from_db()
        self.assertEqual(self.rejected_disabled.status, CustomTourStatus.REJECTED)

    def test_reapply_pending_returns_403(self):
        pending = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.PENDING,
            title="Pending",
            destination="Cox",
            start_date=self.valid_start,
            end_date=self.end_date,
            travelers=1,
            estimated_budget=Decimal("20000"),
            currency="BDT",
        )
        self._login()
        response = self.client.post(
            f"/api/custom-tours/{pending.id}/reapply/",
            self._payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reapply_start_too_soon_400(self):
        self._login()
        response = self.client.post(
            f"/api/custom-tours/{self.rejected.id}/reapply/",
            self._payload(start_date=self.too_soon.isoformat()),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.rejected.refresh_from_db()
        self.assertEqual(self.rejected.status, CustomTourStatus.REJECTED)

    def test_reapply_foreign_tour_404(self):
        self._login(email="other@example.com")
        response = self.client.post(
            f"/api/custom-tours/{self.rejected.id}/reapply/",
            self._payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)