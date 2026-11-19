"""Admin dashboard aggregates (Story 9.3)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from bookings.models import BookingStatus
from bookings.services import BookingService
from custom_tours.models import CustomTour, CustomTourStatus
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date

User = get_user_model()

PACKAGE_FIELDS = {
    "title": "Cox's Bazar Escape",
    "short_description": "Beach weekend.",
    "full_description": "Guided coastal tour.",
    "destinations": "Cox's Bazar",
    "duration_days": 3,
    "duration_nights": 2,
    "starting_location": "Dhaka",
    "base_price": Decimal("22000.00"),
    "currency": "BDT",
    "included_services": "Hotel",
    "excluded_services": "Flights",
    "itinerary": "Day 1 arrive.",
}


class AdminDashboardAPITests(APITestCase):
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
        TourPackage.objects.create(**PACKAGE_FIELDS, status=PackageStatus.PUBLISHED)
        TourPackage.objects.create(
            **{**PACKAGE_FIELDS, "title": "Draft pkg"},
            status=PackageStatus.DRAFT,
        )
        published = TourPackage.objects.get(status=PackageStatus.PUBLISHED)
        available = AvailableDate.objects.create(
            package=published,
            tour_date=min_bookable_date() + timedelta(days=5),
            is_active=True,
        )
        booking = BookingService().create(
            customer=self.customer,
            package_id=published.id,
            available_date_id=available.id,
            travelers=2,
            contact_name="Casey",
            contact_email="customer@example.com",
            contact_phone="0123",
        )
        self.assertEqual(booking.status, BookingStatus.PENDING)

        CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.PENDING,
            title="Trek",
            destination="Bandarban",
            start_date=min_bookable_date() + timedelta(days=7),
            end_date=min_bookable_date() + timedelta(days=9),
            travelers=2,
            estimated_budget=Decimal("50000"),
            currency="BDT",
        )
        CustomTour.objects.create(
            customer=self.customer,
            status=CustomTourStatus.APPROVED,
            title="Approved tour",
            destination="Sylhet",
            start_date=min_bookable_date() + timedelta(days=10),
            end_date=min_bookable_date() + timedelta(days=12),
            travelers=1,
            estimated_budget=Decimal("40000"),
            currency="BDT",
        )

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login(self, email):
        response = self.client.post(
            "/api/auth/login/",
            {"email": email, "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_dashboard_lists_nine_metrics(self):
        self._login("admin@example.com")
        response = self.client.get("/api/dashboard/admin/", **self._headers())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["total_packages"], 2)
        self.assertEqual(body["published_packages"], 1)
        self.assertEqual(body["draft_packages"], 1)
        self.assertEqual(body["pending_bookings"], 1)
        self.assertEqual(body["approved_bookings"], 0)
        self.assertEqual(body["rejected_bookings"], 0)
        self.assertEqual(body["pending_custom_tours"], 1)
        self.assertEqual(body["approved_custom_tours"], 1)
        self.assertEqual(body["rejected_custom_tours"], 0)

    def test_customer_denied_admin_dashboard(self):
        self._login("customer@example.com")
        response = self.client.get("/api/dashboard/admin/", **self._headers())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)