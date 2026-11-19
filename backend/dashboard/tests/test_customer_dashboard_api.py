"""Customer dashboard aggregates (Story 9.2)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from bookings.models import BookingStatus
from bookings.services import BookingService
from notifications.services import NotificationService
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date

User = get_user_model()


class CustomerDashboardAPITests(APITestCase):
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
        self.package = TourPackage.objects.create(
            title="Coast Tour",
            destination="Cox's Bazar",
            short_description="Beach",
            long_description="Long",
            duration_days=3,
            base_price=Decimal("10000"),
            currency="BDT",
            status=PackageStatus.PUBLISHED,
        )
        self.available = AvailableDate.objects.create(
            package=self.package,
            date=min_bookable_date() + timedelta(days=5),
            is_active=True,
        )

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login_customer(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_reflects_pending_open_window_and_unread(self):
        booking_service = BookingService()
        booking = booking_service.create(
            customer=self.customer,
            package_id=self.package.id,
            available_date_id=self.available.id,
            travelers=2,
            contact_name="Casey",
            contact_email="customer@example.com",
            contact_phone="0123",
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

        NotificationService().create(
            recipient_id=self.customer.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=str(booking.id),
            payload={"reference": booking.reference},
        )

        self._login_customer()
        response = self.client.get("/api/dashboard/customer/", **self._headers())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["pending_bookings"], 1)
        self.assertEqual(response.json()["open_payment_windows"], 0)
        self.assertEqual(response.json()["unread_notifications"], 1)

        booking_service.approve(admin=self.admin, booking_id=booking.id)

        response = self.client.get("/api/dashboard/customer/", **self._headers())
        body = response.json()
        self.assertEqual(body["pending_bookings"], 0)
        self.assertEqual(body["open_payment_windows"], 1)
        self.assertEqual(body["unread_notifications"], 1)