"""Booking list / detail / cancel API matrix (Story 5.3)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
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


class BookingHistoryCancelAPITests(APITestCase):
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
            "contact_name": customer.full_name,
            "contact_email": customer.email,
            "contact_phone": "+8801700000000",
        }
        kwargs.update(overrides)
        return BookingService().create(**kwargs)

    # --- list ---------------------------------------------------------

    def test_list_returns_only_own_bookings_with_separate_statuses(self):
        mine = self._make_booking(self.customer)
        self._make_booking(self.other)
        self._login("customer@example.com")

        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertEqual(row["id"], str(mine.id))
        self.assertEqual(row["reference"], mine.reference)
        self.assertEqual(row["package_title"], self.package.title)
        self.assertEqual(row["tour_date"], self.far_date.isoformat())
        self.assertEqual(row["travelers"], 2)
        self.assertIn("created_at", row)
        self.assertEqual(row["status"], BookingStatus.PENDING)
        self.assertEqual(row["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(row["payment_window_status"], PaymentWindowStatus.NOT_OPEN)

    def test_list_empty_when_no_bookings(self):
        self._login("customer@example.com")
        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_list_newest_first(self):
        first = self._make_booking(self.customer)
        second = self._make_booking(self.customer)
        # Clock resolution can tie created_at on fast machines; make it explicit.
        now = timezone.now()
        Booking.objects.filter(pk=first.pk).update(created_at=now - timedelta(hours=1))
        Booking.objects.filter(pk=second.pk).update(created_at=now)
        self._login("customer@example.com")
        response = self.client.get("/api/bookings/")
        self.assertEqual(
            [row["id"] for row in response.data],
            [str(second.id), str(first.id)],
        )

    def test_guest_and_admin_denied_on_list_detail_cancel(self):
        booking = self._make_booking(self.customer)
        paths = [
            ("get", "/api/bookings/"),
            ("get", f"/api/bookings/{booking.id}/"),
            ("post", f"/api/bookings/{booking.id}/cancel/"),
        ]
        for method, path in paths:
            guest = getattr(self.client, method)(path, **self._headers())
            self.assertIn(
                guest.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                path,
            )
        self._login("admin@example.com")
        for method, path in paths:
            denied = getattr(self.client, method)(path, **self._headers())
            self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN, path)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)

    # --- detail -------------------------------------------------------

    def test_detail_own_booking(self):
        booking = self._make_booking(self.customer, additional_requirements="Vegan")
        self._login("customer@example.com")
        response = self.client.get(f"/api/bookings/{booking.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(booking.id))
        self.assertEqual(response.data["reference"], booking.reference)
        self.assertEqual(response.data["package_title"], self.package.title)
        self.assertEqual(response.data["additional_requirements"], "Vegan")
        self.assertEqual(response.data["status"], BookingStatus.PENDING)
        self.assertEqual(response.data["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(
            response.data["payment_window_status"], PaymentWindowStatus.NOT_OPEN
        )

    def test_detail_other_customer_and_missing_are_404(self):
        theirs = self._make_booking(self.other)
        self._login("customer@example.com")
        self.assertEqual(
            self.client.get(f"/api/bookings/{theirs.id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.get(f"/api/bookings/{uuid.uuid4()}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_reference_is_not_a_detail_key(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        response = self.client.get(f"/api/bookings/{booking.reference}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- cancel -------------------------------------------------------

    def test_cancel_pending_sets_cancelled_and_emits_notification_once(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        response = self.client.post(
            f"/api/bookings/{booking.id}/cancel/", **self._headers()
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], BookingStatus.CANCELLED)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELLED)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.customer,
                event_key="booking.cancelled",
                entity_type="booking",
                entity_id=str(booking.id),
            ).count(),
            1,
        )

    def test_cancel_does_not_touch_payment_window(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        self.client.post(f"/api/bookings/{booking.id}/cancel/", **self._headers())
        window = PaymentWindow.objects.get(booking=booking)
        self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)

    def test_second_cancel_rejected_without_duplicate_notification(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        first = self.client.post(
            f"/api/bookings/{booking.id}/cancel/", **self._headers()
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self.client.post(
            f"/api/bookings/{booking.id}/cancel/", **self._headers()
        )
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            Notification.objects.filter(event_key="booking.cancelled").count(), 1
        )

    def test_cancel_blocked_for_non_pending_statuses(self):
        self._login("customer@example.com")
        for blocked in (
            BookingStatus.APPROVED,
            BookingStatus.REJECTED,
            BookingStatus.CANCELLED,
        ):
            booking = self._make_booking(self.customer)
            Booking.objects.filter(pk=booking.pk).update(status=blocked)
            response = self.client.post(
                f"/api/bookings/{booking.id}/cancel/", **self._headers()
            )
            self.assertEqual(response.status_code, status.HTTP_409_CONFLICT, blocked)
            booking.refresh_from_db()
            self.assertEqual(booking.status, blocked)
        self.assertEqual(
            Notification.objects.filter(event_key="booking.cancelled").count(), 0
        )

    def test_cancel_other_customer_booking_is_404_and_unchanged(self):
        theirs = self._make_booking(self.other)
        self._login("customer@example.com")
        response = self.client.post(
            f"/api/bookings/{theirs.id}/cancel/", **self._headers()
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        theirs.refresh_from_db()
        self.assertEqual(theirs.status, BookingStatus.PENDING)
        self.assertEqual(
            Notification.objects.filter(event_key="booking.cancelled").count(), 0
        )

    def test_cancel_requires_csrf(self):
        booking = self._make_booking(self.customer)
        self._login("customer@example.com")
        response = self.client.post(f"/api/bookings/{booking.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)

    def test_cancel_rolls_back_status_when_notification_fails(self):
        booking = self._make_booking(self.customer)

        class BoomNotifications:
            def create(self, **kwargs):
                raise RuntimeError("notif boom")

        with self.assertRaises(RuntimeError):
            BookingService(notifications=BoomNotifications()).cancel(
                customer=self.customer, booking_id=booking.id
            )
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)
