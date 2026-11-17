"""Admin reject booking with mandatory reason API matrix (Story 6.3)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from bookings.models import Booking, BookingStatus
from bookings.services import BookingService
from notifications.models import Notification
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import PaymentWindow, PaymentWindowStatus

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

REASON = "No capacity on that date."


class AdminBookingRejectAPITests(APITestCase):
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

    def _reject(self, reason=REASON, booking_id=None, body=None):
        booking_id = booking_id or self.booking.id
        payload = body if body is not None else {"rejection_reason": reason}
        return self.client.post(
            f"/api/bookings/admin/{booking_id}/reject/",
            payload,
            format="json",
            **self._headers(),
        )

    def _assert_untouched(self):
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertEqual(self.booking.rejection_reason, "")
        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)
        self.assertIsNone(window.opened_at)
        self.assertIsNone(window.deadline_at)
        self.assertFalse(AuditLog.objects.filter(action="booking.reject").exists())
        self.assertFalse(
            Notification.objects.filter(event_key="booking.rejected").exists()
        )

    # --- happy path ---------------------------------------------------

    def test_reject_persists_reason_and_keeps_window_not_open(self):
        window_before = PaymentWindow.objects.get(booking=self.booking)
        self._login("admin@example.com")

        response = self._reject()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.booking.id))
        self.assertEqual(response.data["status"], BookingStatus.REJECTED)
        self.assertEqual(response.data["rejection_reason"], REASON)
        self.assertEqual(
            response.data["payment_window_status"], PaymentWindowStatus.NOT_OPEN
        )

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.REJECTED)
        self.assertEqual(self.booking.rejection_reason, REASON)
        self.assertIsNone(self.booking.approved_at)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 1)
        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.pk, window_before.pk)
        self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)
        self.assertIsNone(window.opened_at)
        self.assertIsNone(window.deadline_at)

    def test_reason_is_trimmed(self):
        self._login("admin@example.com")
        response = self._reject(reason="   Fully booked.  \n")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.rejection_reason, "Fully booked.")

    def test_reason_at_max_length_is_accepted(self):
        self._login("admin@example.com")
        response = self._reject(reason="x" * 2000)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(len(self.booking.rejection_reason), 2000)

    def test_reject_records_audit_and_notifies_customer_with_reason(self):
        self._login("admin@example.com")
        self._reject()

        audit = AuditLog.objects.get(action="booking.reject")
        self.assertEqual(audit.actor_id, self.admin.id)
        self.assertEqual(audit.target_type, "booking")
        self.assertEqual(audit.target_id, str(self.booking.id))
        self.assertEqual(audit.before["status"], BookingStatus.PENDING)
        self.assertEqual(audit.before["rejection_reason"], "")
        self.assertEqual(audit.after["status"], BookingStatus.REJECTED)
        self.assertEqual(audit.after["rejection_reason"], REASON)
        self.assertEqual(audit.after["payment_window_status"], "NOT_OPEN")

        notification = Notification.objects.get(event_key="booking.rejected")
        self.assertEqual(notification.recipient_id, self.customer.id)
        self.assertEqual(notification.entity_type, "booking")
        self.assertEqual(notification.entity_id, str(self.booking.id))
        self.assertEqual(notification.payload["reference"], self.booking.reference)
        self.assertEqual(notification.payload["rejection_reason"], REASON)
        self.assertFalse(
            Notification.objects.filter(event_key="booking.approved").exists()
        )

    def test_reject_does_not_open_window_via_payment_service(self):
        self._login("admin@example.com")
        with mock.patch(
            "bookings.services.PaymentService.open_window_for_booking"
        ) as open_window:
            response = self._reject()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        open_window.assert_not_called()

    # --- reason validation --------------------------------------------

    def test_blank_or_whitespace_reason_is_400_with_no_change(self):
        self._login("admin@example.com")
        for blank in ("", "   ", "\n\t "):
            with self.subTest(reason=repr(blank)):
                response = self._reject(reason=blank)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("rejection_reason", response.data)
                self._assert_untouched()

    def test_missing_reason_is_400_with_no_change(self):
        self._login("admin@example.com")
        response = self._reject(body={})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rejection_reason", response.data)
        self._assert_untouched()

    def test_too_long_reason_is_400_with_no_change(self):
        self._login("admin@example.com")
        response = self._reject(reason="x" * 2001)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rejection_reason", response.data)
        self._assert_untouched()

    def test_service_rejects_blank_reason_directly(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            BookingService().reject(
                admin=self.admin, booking_id=self.booking.id, reason="   "
            )
        self._assert_untouched()

    # --- state guards -------------------------------------------------

    def test_non_pending_booking_is_409_with_no_change(self):
        self._login("admin@example.com")
        for blocked in (
            BookingStatus.APPROVED,
            BookingStatus.REJECTED,
            BookingStatus.CANCELLED,
        ):
            with self.subTest(status=blocked):
                Booking.objects.filter(pk=self.booking.pk).update(status=blocked)
                response = self._reject()
                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
                self.booking.refresh_from_db()
                self.assertEqual(self.booking.status, blocked)
                self.assertEqual(self.booking.rejection_reason, "")
        self.assertFalse(AuditLog.objects.filter(action="booking.reject").exists())
        self.assertFalse(
            Notification.objects.filter(event_key="booking.rejected").exists()
        )

    def test_second_reject_is_409_and_keeps_original_reason(self):
        self._login("admin@example.com")
        self.assertEqual(self._reject().status_code, status.HTTP_200_OK)

        response = self._reject(reason="Different reason.")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.rejection_reason, REASON)
        self.assertEqual(AuditLog.objects.filter(action="booking.reject").count(), 1)
        self.assertEqual(
            Notification.objects.filter(event_key="booking.rejected").count(), 1
        )

    def test_approved_booking_cannot_be_rejected_and_window_stays_open(self):
        self._login("admin@example.com")
        approve = self.client.post(
            f"/api/bookings/admin/{self.booking.id}/approve/", **self._headers()
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)

        response = self._reject()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.APPROVED)
        self.assertEqual(self.booking.rejection_reason, "")
        self.assertEqual(
            PaymentWindow.objects.get(booking=self.booking).status,
            PaymentWindowStatus.OPEN,
        )

    def test_unknown_booking_is_404(self):
        self._login("admin@example.com")
        response = self._reject(booking_id=uuid.uuid4())
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- atomicity ----------------------------------------------------

    def test_notification_failure_rolls_back_status_reason_and_audit(self):
        self._login("admin@example.com")
        with mock.patch(
            "bookings.services.NotificationService.create",
            side_effect=RuntimeError("boom"),
        ):
            self.client.raise_request_exception = False
            response = self._reject()
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self._assert_untouched()

    def test_audit_failure_rolls_back_status_and_reason(self):
        self._login("admin@example.com")
        with mock.patch(
            "bookings.services.AuditService.record",
            side_effect=RuntimeError("boom"),
        ):
            self.client.raise_request_exception = False
            response = self._reject()
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self._assert_untouched()

    # --- access control -----------------------------------------------

    def test_customer_is_denied(self):
        self._login("customer@example.com")
        response = self._reject()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self._assert_untouched()

    def test_guest_is_denied(self):
        response = self._reject()
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self._assert_untouched()

    def test_csrf_is_required(self):
        self._login("admin@example.com")
        response = self.client.post(
            f"/api/bookings/admin/{self.booking.id}/reject/",
            {"rejection_reason": REASON},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self._assert_untouched()

    def test_get_is_not_allowed(self):
        self._login("admin@example.com")
        response = self.client.get(f"/api/bookings/admin/{self.booking.id}/reject/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self._assert_untouched()

    # --- reason visible on detail responses ---------------------------

    def test_admin_detail_serializes_rejection_reason(self):
        self._login("admin@example.com")
        self._reject()
        response = self.client.get(f"/api/bookings/admin/{self.booking.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], BookingStatus.REJECTED)
        self.assertEqual(response.data["rejection_reason"], REASON)

    def test_customer_sees_reason_and_no_checkout_after_rejection(self):
        self._login("admin@example.com")
        self._reject()
        self.client.post("/api/auth/logout/", **self._headers())
        self.client.get("/api/auth/csrf/")
        self._login("customer@example.com")

        response = self.client.get(f"/api/bookings/{self.booking.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], BookingStatus.REJECTED)
        self.assertEqual(response.data["rejection_reason"], REASON)
        self.assertEqual(
            response.data["payment_window_status"], PaymentWindowStatus.NOT_OPEN
        )

        listing = self.client.get("/api/bookings/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data[0]["rejection_reason"], REASON)

    def test_customer_cannot_cancel_after_rejection(self):
        self._login("admin@example.com")
        self._reject()
        self.client.post("/api/auth/logout/", **self._headers())
        self.client.get("/api/auth/csrf/")
        self._login("customer@example.com")

        response = self.client.post(
            f"/api/bookings/{self.booking.id}/cancel/", **self._headers()
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_pending_booking_has_empty_reason(self):
        self._login("customer@example.com")
        response = self.client.get(f"/api/bookings/{self.booking.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rejection_reason"], "")
