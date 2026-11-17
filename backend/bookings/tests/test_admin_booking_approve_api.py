"""Admin approve booking + open payment window API matrix (Story 6.2)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from bookings.models import Booking, BookingStatus
from bookings.services import BookingService
from notifications.models import Notification
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import Payment, PaymentStatus, PaymentWindow, PaymentWindowStatus

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


class AdminBookingApproveAPITests(APITestCase):
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
        self.booking = BookingService().create(
            customer=self.customer,
            package_id=self.package.id,
            available_date_id=self.available_date.id,
            travelers=2,
            contact_name="Contact Person",
            contact_email="contact@example.com",
            contact_phone="+8801700000000",
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

    def _approve(self, booking_id=None):
        booking_id = booking_id or self.booking.id
        return self.client.post(
            f"/api/bookings/admin/{booking_id}/approve/", **self._headers()
        )

    def _assert_untouched(self):
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertIsNone(self.booking.approved_at)
        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)
        self.assertIsNone(window.opened_at)
        self.assertIsNone(window.deadline_at)
        self.assertFalse(AuditLog.objects.filter(action="booking.approve").exists())
        self.assertFalse(
            Notification.objects.filter(event_key="booking.approved").exists()
        )

    # --- happy path ---------------------------------------------------

    def test_approve_opens_same_window_with_24h_deadline(self):
        window_before = PaymentWindow.objects.get(booking=self.booking)
        self._login("admin@example.com")

        response = self._approve()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.booking.id))
        self.assertEqual(response.data["status"], BookingStatus.APPROVED)
        self.assertEqual(response.data["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(
            response.data["payment_window_status"], PaymentWindowStatus.OPEN
        )

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.APPROVED)
        self.assertIsNotNone(self.booking.approved_at)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 1)
        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.pk, window_before.pk)
        self.assertEqual(window.status, PaymentWindowStatus.OPEN)
        self.assertEqual(window.opened_at, self.booking.approved_at)
        self.assertEqual(
            window.deadline_at, self.booking.approved_at + timedelta(hours=24)
        )
        payment = Payment.objects.get(booking=self.booking)
        self.assertEqual(payment.status, PaymentStatus.UNPAID)

    def test_approve_records_audit_and_notifies_customer(self):
        self._login("admin@example.com")
        self._approve()

        audit = AuditLog.objects.get(action="booking.approve")
        self.assertEqual(audit.actor_id, self.admin.id)
        self.assertEqual(audit.target_type, "booking")
        self.assertEqual(audit.target_id, str(self.booking.id))
        self.assertEqual(audit.before["status"], BookingStatus.PENDING)
        self.assertEqual(audit.before["payment_window_status"], "NOT_OPEN")
        self.assertEqual(audit.after["status"], BookingStatus.APPROVED)
        self.assertEqual(audit.after["payment_window_status"], "OPEN")
        self.assertIsNotNone(audit.after["payment_window_deadline_at"])

        notification = Notification.objects.get(event_key="booking.approved")
        self.assertEqual(notification.recipient_id, self.customer.id)
        self.assertEqual(notification.entity_type, "booking")
        self.assertEqual(notification.entity_id, str(self.booking.id))
        self.assertEqual(notification.payload["reference"], self.booking.reference)

    def test_approve_allows_exactly_seven_days_ahead(self):
        # Boundary: min_bookable_date (today + 7 in Asia/Dhaka) is still valid.
        AvailableDate.objects.filter(pk=self.available_date.pk).update(
            tour_date=min_bookable_date(as_of=today_in_business_tz())
        )
        self._login("admin@example.com")
        response = self._approve()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- 7-day rule at approve time -----------------------------------

    def test_approve_blocked_when_tour_date_inside_seven_days(self):
        AvailableDate.objects.filter(pk=self.available_date.pk).update(
            tour_date=min_bookable_date(as_of=today_in_business_tz())
            - timedelta(days=1)
        )
        self._login("admin@example.com")

        response = self._approve()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("7 calendar days", response.data["detail"][0])
        self._assert_untouched()

    def test_approve_blocked_when_tour_date_in_the_past(self):
        AvailableDate.objects.filter(pk=self.available_date.pk).update(
            tour_date=today_in_business_tz() - timedelta(days=3)
        )
        self._login("admin@example.com")
        response = self._approve()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_untouched()

    # --- state guards -------------------------------------------------

    def test_non_pending_booking_is_409_with_no_change(self):
        for blocked in (
            BookingStatus.APPROVED,
            BookingStatus.REJECTED,
            BookingStatus.CANCELLED,
        ):
            with self.subTest(status=blocked):
                Booking.objects.filter(pk=self.booking.pk).update(status=blocked)
                self._login("admin@example.com")
                response = self._approve()
                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
                window = PaymentWindow.objects.get(booking=self.booking)
                self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)
                self.assertIsNone(window.deadline_at)
        self.assertFalse(AuditLog.objects.filter(action="booking.approve").exists())
        self.assertFalse(
            Notification.objects.filter(event_key="booking.approved").exists()
        )

    def test_second_approve_is_409_and_does_not_reset_deadline(self):
        self._login("admin@example.com")
        self.assertEqual(self._approve().status_code, status.HTTP_200_OK)
        first_deadline = PaymentWindow.objects.get(booking=self.booking).deadline_at

        response = self._approve()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            PaymentWindow.objects.get(booking=self.booking).deadline_at, first_deadline
        )
        self.assertEqual(AuditLog.objects.filter(action="booking.approve").count(), 1)
        self.assertEqual(
            Notification.objects.filter(event_key="booking.approved").count(), 1
        )

    def test_missing_window_is_400_with_no_insert_or_status_change(self):
        PaymentWindow.objects.filter(booking=self.booking).delete()
        self._login("admin@example.com")

        response = self._approve()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 0)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertIsNone(self.booking.approved_at)
        self.assertFalse(AuditLog.objects.filter(action="booking.approve").exists())
        self.assertFalse(
            Notification.objects.filter(event_key="booking.approved").exists()
        )

    def test_window_not_not_open_is_409_and_rolls_back(self):
        PaymentWindow.objects.filter(booking=self.booking).update(
            status=PaymentWindowStatus.EXPIRED
        )
        self._login("admin@example.com")

        response = self._approve()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertIsNone(self.booking.approved_at)

    def test_unknown_booking_is_404(self):
        self._login("admin@example.com")
        response = self._approve(uuid.uuid4())
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- atomicity ----------------------------------------------------

    def test_notification_failure_rolls_back_status_window_and_audit(self):
        self._login("admin@example.com")
        with mock.patch(
            "bookings.services.NotificationService.create",
            side_effect=RuntimeError("boom"),
        ):
            self.client.raise_request_exception = False
            response = self._approve()
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self._assert_untouched()

    def test_audit_failure_rolls_back_status_and_window(self):
        self._login("admin@example.com")
        with mock.patch(
            "bookings.services.AuditService.record",
            side_effect=RuntimeError("boom"),
        ):
            self.client.raise_request_exception = False
            response = self._approve()
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self._assert_untouched()

    # --- access control -----------------------------------------------

    def test_customer_is_denied(self):
        self._login("customer@example.com")
        response = self._approve()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self._assert_untouched()

    def test_guest_is_denied(self):
        response = self._approve()
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self._assert_untouched()

    def test_csrf_is_required(self):
        self._login("admin@example.com")
        response = self.client.post(f"/api/bookings/admin/{self.booking.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self._assert_untouched()

    def test_get_is_not_allowed(self):
        self._login("admin@example.com")
        response = self.client.get(f"/api/bookings/admin/{self.booking.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self._assert_untouched()

    # --- customer contracts unchanged ---------------------------------

    def test_customer_sees_approved_open_unpaid_after_approval(self):
        self._login("admin@example.com")
        self._approve()
        self.client.post("/api/auth/logout/", **self._headers())
        self.client.get("/api/auth/csrf/")
        self._login("customer@example.com")

        response = self.client.get(f"/api/bookings/{self.booking.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], BookingStatus.APPROVED)
        self.assertEqual(response.data["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(response.data["payment_window_status"], PaymentWindowStatus.OPEN)

    def test_customer_cannot_cancel_after_approval(self):
        self._login("admin@example.com")
        self._approve()
        self.client.post("/api/auth/logout/", **self._headers())
        self.client.get("/api/auth/csrf/")
        self._login("customer@example.com")

        response = self.client.post(
            f"/api/bookings/{self.booking.id}/cancel/", **self._headers()
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_approve_time_is_timezone_aware(self):
        self._login("admin@example.com")
        before = timezone.now()
        self._approve()
        self.booking.refresh_from_db()
        self.assertTrue(timezone.is_aware(self.booking.approved_at))
        self.assertGreaterEqual(self.booking.approved_at, before)
