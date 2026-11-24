"""Admin custom tour review API (Story 8.3)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from custom_tours.models import CustomTour, CustomTourStatus
from custom_tours.services import CustomTourReapplyNotAllowed, CustomTourService
from notifications.models import Notification
from packages.models import TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import PaymentWindowStatus
from payments.services import PaymentService

User = get_user_model()


class AdminCustomTourAPITests(APITestCase):
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
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            full_name="Ada Admin",
            role=Role.ADMIN,
            is_staff=True,
        )
        self.as_of = today_in_business_tz()
        self.valid_start = min_bookable_date(as_of=self.as_of) + timedelta(days=3)
        self.invalid_start = self.as_of + timedelta(days=2)

        self.pending = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.PENDING,
            title="Hill Trek",
            destination="Bandarban",
            start_date=self.valid_start,
            end_date=self.valid_start + timedelta(days=2),
            travelers=2,
            estimated_budget=Decimal("80000"),
            currency="BDT",
        )
        self.too_soon = CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.PENDING,
            title="Soon trip",
            destination="Dhaka",
            start_date=self.invalid_start,
            end_date=self.invalid_start + timedelta(days=1),
            travelers=1,
            estimated_budget=Decimal("10000"),
            currency="BDT",
        )
        payments = PaymentService()
        payments.create_not_open_for_custom_tour(self.pending)
        payments.create_not_open_for_custom_tour(self.too_soon)

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login_admin(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_approve_pending_sets_approved_without_package(self):
        self._login_admin()
        before_packages = TourPackage.objects.count()
        response = self.client.post(
            f"/api/custom-tours/admin/{self.pending.id}/approve/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["status"], CustomTourStatus.APPROVED)
        self.assertEqual(body["payment_window_status"], PaymentWindowStatus.OPEN)
        self.assertTrue(body["payment_eligible"])
        self.pending.refresh_from_db()
        self.assertIsNotNone(self.pending.approved_at)
        self.assertEqual(TourPackage.objects.count(), before_packages)
        self.assertEqual(
            self.pending.payment_window.status, PaymentWindowStatus.OPEN
        )
        self.assertTrue(
            Notification.objects.filter(
                event_key="custom_tour.approved",
                entity_id=str(self.pending.id),
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="custom_tour.approve",
                target_id=str(self.pending.id),
            ).exists()
        )

    def test_approve_fails_7_day_rule_stays_pending(self):
        self._login_admin()
        response = self.client.post(
            f"/api/custom-tours/admin/{self.too_soon.id}/approve/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.too_soon.refresh_from_db()
        self.assertEqual(self.too_soon.status, CustomTourStatus.PENDING)

    def test_reject_with_reapply_sends_both_notifications(self):
        self._login_admin()
        response = self.client.post(
            f"/api/custom-tours/admin/{self.pending.id}/reject/",
            {
                "rejection_reason": "Budget does not match scope.",
                "recommended_adjustments": "Reduce destinations.",
                "reapply_enabled": True,
            },
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, CustomTourStatus.REJECTED)
        self.assertTrue(self.pending.reapply_enabled)
        self.assertEqual(
            Notification.objects.filter(
                event_key="custom_tour.rejected",
                entity_id=str(self.pending.id),
            ).count(),
            1,
        )
        self.assertEqual(
            Notification.objects.filter(
                event_key="custom_tour.reapply_enabled",
                entity_id=str(self.pending.id),
            ).count(),
            1,
        )

    def test_assert_reapply_allowed_blocks_when_disabled(self):
        self.pending.status = CustomTourStatus.REJECTED
        self.pending.reapply_enabled = False
        self.pending.save()
        with self.assertRaises(CustomTourReapplyNotAllowed):
            CustomTourService.assert_reapply_allowed(self.pending)

    def test_list_filter_by_status(self):
        self._login_admin()
        CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.APPROVED,
            title="Done",
            destination="X",
            start_date=self.valid_start,
            end_date=self.valid_start,
            travelers=1,
            estimated_budget=Decimal("1"),
            currency="BDT",
        )
        response = self.client.get(
            "/api/custom-tours/admin/?status=APPROVED",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertTrue(all(r["status"] == CustomTourStatus.APPROVED for r in results))

    def test_customer_cannot_call_admin_list(self):
        self.client.post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        response = self.client.get("/api/custom-tours/admin/", **self._headers())
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )