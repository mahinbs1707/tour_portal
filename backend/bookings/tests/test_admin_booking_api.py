"""Admin booking list / filter / detail API matrix (Story 6.1)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from bookings.admin_views import ADMIN_BOOKING_LIST_PAGE_SIZE
from bookings.models import Booking, BookingStatus
from bookings.services import BookingService
from notifications.models import Notification
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import PaymentStatus, PaymentWindow, PaymentWindowStatus

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


class AdminBookingAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.client.get("/api/auth/csrf/")

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="SecurePass1",
            full_name="Other Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            full_name="Ada Admin",
            role=Role.ADMIN,
            is_staff=True,
        )
        as_of = today_in_business_tz()
        self.far_date = min_bookable_date(as_of=as_of) + timedelta(days=7)
        self.package = TourPackage.objects.create(
            **PACKAGE_FIELDS, status=PackageStatus.PUBLISHED
        )
        self.available_date = AvailableDate.objects.create(
            package=self.package, tour_date=self.far_date, is_active=True
        )

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        return {"HTTP_X_CSRFTOKEN": cookie.value}

    def _login(self, email):
        response = self.client.post(
            "/api/auth/login/",
            {"email": email, "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _make_booking(self, customer, **overrides):
        kwargs = {
            "customer": customer,
            "package_id": self.package.id,
            "available_date_id": self.available_date.id,
            "travelers": 2,
            "contact_name": "Contact Person",
            "contact_email": "contact@example.com",
            "contact_phone": "+8801700000000",
        }
        kwargs.update(overrides)
        return BookingService().create(**kwargs)

    # --- list ---------------------------------------------------------

    def test_list_returns_all_customers_bookings_with_separate_statuses(self):
        mine = self._make_booking(self.customer)
        theirs = self._make_booking(self.other)
        self._login("admin@example.com")

        response = self.client.get("/api/bookings/admin/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        ids = {row["id"] for row in response.data["results"]}
        self.assertEqual(ids, {str(mine.id), str(theirs.id)})
        row = next(r for r in response.data["results"] if r["id"] == str(mine.id))
        self.assertEqual(row["reference"], mine.reference)
        self.assertEqual(row["package_title"], self.package.title)
        self.assertEqual(row["tour_date"], self.far_date.isoformat())
        self.assertEqual(row["travelers"], 2)
        self.assertEqual(row["status"], BookingStatus.PENDING)
        self.assertEqual(row["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(row["payment_window_status"], PaymentWindowStatus.NOT_OPEN)
        self.assertEqual(row["customer_full_name"], "Casey Customer")
        self.assertEqual(row["customer_email"], "customer@example.com")

    def test_list_empty(self):
        self._login("admin@example.com")
        response = self.client.get("/api/bookings/admin/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_list_newest_first(self):
        first = self._make_booking(self.customer)
        second = self._make_booking(self.other)
        now = timezone.now()
        Booking.objects.filter(pk=first.pk).update(created_at=now - timedelta(hours=1))
        Booking.objects.filter(pk=second.pk).update(created_at=now)
        self._login("admin@example.com")
        response = self.client.get("/api/bookings/admin/")
        self.assertEqual(
            [r["id"] for r in response.data["results"]],
            [str(second.id), str(first.id)],
        )

    def test_filter_pending_returns_only_pending(self):
        pending = self._make_booking(self.customer)
        approved = self._make_booking(self.other)
        Booking.objects.filter(pk=approved.pk).update(status=BookingStatus.APPROVED)
        self._login("admin@example.com")

        response = self.client.get("/api/bookings/admin/?status=PENDING")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(pending.id))

        response = self.client.get("/api/bookings/admin/?status=APPROVED")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(approved.id))

    def test_no_filter_returns_all_statuses(self):
        for blocked in (BookingStatus.APPROVED, BookingStatus.REJECTED):
            b = self._make_booking(self.customer)
            Booking.objects.filter(pk=b.pk).update(status=blocked)
        self._make_booking(self.customer)
        self._login("admin@example.com")
        response = self.client.get("/api/bookings/admin/")
        self.assertEqual(response.data["count"], 3)

    def test_invalid_status_filter_is_400(self):
        self._make_booking(self.customer)
        self._login("admin@example.com")
        response = self.client.get("/api/bookings/admin/?status=BOGUS")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)
        # Lowercase is not a valid enum value either.
        response = self.client.get("/api/bookings/admin/?status=pending")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_is_paginated(self):
        for _ in range(ADMIN_BOOKING_LIST_PAGE_SIZE + 1):
            self._make_booking(self.customer)
        self._login("admin@example.com")
        page1 = self.client.get("/api/bookings/admin/")
        self.assertEqual(page1.data["count"], ADMIN_BOOKING_LIST_PAGE_SIZE + 1)
        self.assertEqual(len(page1.data["results"]), ADMIN_BOOKING_LIST_PAGE_SIZE)
        self.assertIsNotNone(page1.data["next"])
        page2 = self.client.get("/api/bookings/admin/?page=2")
        self.assertEqual(len(page2.data["results"]), 1)
        self.assertIsNone(page2.data["next"])

    # --- detail -------------------------------------------------------

    def test_detail_has_required_fields(self):
        booking = self._make_booking(
            self.customer,
            additional_requirements="Vegan meals",
            contact_name="Contact Person",
            contact_email="contact@example.com",
        )
        self._login("admin@example.com")
        response = self.client.get(f"/api/bookings/admin/{booking.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["id"], str(booking.id))
        self.assertEqual(data["reference"], booking.reference)
        self.assertEqual(data["package_title"], self.package.title)
        self.assertEqual(data["tour_date"], self.far_date.isoformat())
        self.assertEqual(data["travelers"], 2)
        self.assertEqual(data["additional_requirements"], "Vegan meals")
        self.assertIn("created_at", data)
        # Account identity (2A) is separate from booking contact fields.
        self.assertEqual(data["customer_full_name"], "Casey Customer")
        self.assertEqual(data["customer_email"], "customer@example.com")
        self.assertEqual(data["contact_name"], "Contact Person")
        self.assertEqual(data["contact_email"], "contact@example.com")
        self.assertEqual(data["contact_phone"], "+8801700000000")
        # Three separate statuses.
        self.assertEqual(data["status"], BookingStatus.PENDING)
        self.assertEqual(data["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(data["payment_window_status"], PaymentWindowStatus.NOT_OPEN)

    def test_detail_missing_is_404(self):
        self._login("admin@example.com")
        response = self.client.get(f"/api/bookings/admin/{uuid.uuid4()}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reference_is_not_a_detail_key(self):
        booking = self._make_booking(self.customer)
        self._login("admin@example.com")
        response = self.client.get(f"/api/bookings/admin/{booking.reference}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- access control -----------------------------------------------

    def test_customer_denied_on_admin_endpoints(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        for path in (
            "/api/bookings/admin/",
            f"/api/bookings/admin/{booking.id}/",
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, path)

    def test_guest_denied_on_admin_endpoints(self):
        booking = self._make_booking(self.customer)
        for path in (
            "/api/bookings/admin/",
            f"/api/bookings/admin/{booking.id}/",
        ):
            response = self.client.get(path)
            self.assertIn(
                response.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                path,
            )

    def test_admin_endpoints_are_read_only(self):
        booking = self._make_booking(self.customer)
        self._login("admin@example.com")
        for method, path in (
            ("post", "/api/bookings/admin/"),
            ("patch", f"/api/bookings/admin/{booking.id}/"),
            ("delete", f"/api/bookings/admin/{booking.id}/"),
        ):
            response = getattr(self.client, method)(path, **self._headers())
            self.assertIn(
                response.status_code,
                (status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED),
                path,
            )
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)
        self.assertEqual(
            PaymentWindow.objects.get(booking=booking).status,
            PaymentWindowStatus.NOT_OPEN,
        )

    def test_reads_do_not_emit_notifications_or_change_state(self):
        booking = self._make_booking(self.customer)
        before = Notification.objects.count()
        self._login("admin@example.com")
        self.client.get("/api/bookings/admin/")
        self.client.get(f"/api/bookings/admin/{booking.id}/")
        self.assertEqual(Notification.objects.count(), before)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # --- customer contract unchanged ----------------------------------

    def test_customer_list_shape_unchanged(self):
        self._make_booking(self.customer)
        self._login("customer@example.com")
        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertNotIn("customer_email", response.data[0])
        self.assertNotIn("customer_full_name", response.data[0])
