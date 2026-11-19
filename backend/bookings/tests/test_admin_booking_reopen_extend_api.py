"""Admin reopen + extend payment window API matrix (Story 6.4)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from bookings.models import BookingStatus
from bookings.services import BookingService, PAYMENT_WINDOW_EXTEND_AUDIT_ACTION, PAYMENT_WINDOW_REOPEN_AUDIT_ACTION
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.eligibility import PaymentNotEligible, assert_payment_eligible, is_payment_eligible
from payments.models import PaymentWindow, PaymentWindowStatus
from payments.services import PaymentService

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


class AdminBookingReopenExtendAPITests(APITestCase):
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
        self._login(self.admin.email)
        self.service = BookingService()
        self.payments = PaymentService()
        self.booking = self.service.approve(
            admin=self.admin, booking_id=self.booking.id
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

    def _expire_window(self):
        """Backdate the window so ``deadline_at`` is past, then persist ``EXPIRED``."""
        window = PaymentWindow.objects.get(booking=self.booking)
        past_opened = timezone.now() - timedelta(hours=48)
        window.opened_at = past_opened
        window.deadline_at = past_opened + timedelta(hours=24)
        window.status = PaymentWindowStatus.OPEN
        window.save(update_fields=["opened_at", "deadline_at", "status", "updated_at"])
        with transaction.atomic():
            self.payments.mark_expired_if_past_deadline(self.booking, now=timezone.now())
        window.refresh_from_db()
        self.assertEqual(window.status, PaymentWindowStatus.EXPIRED)
        self.assertLess(window.deadline_at, timezone.now())
        self.booking.refresh_from_db()

    def _reopen(self):
        return self.client.post(
            f"/api/bookings/admin/{self.booking.id}/reopen/",
            **self._headers(),
        )

    def _extend(self, deadline_iso: str):
        return self.client.post(
            f"/api/bookings/admin/{self.booking.id}/extend/",
            {"deadline_at": deadline_iso},
            format="json",
            **self._headers(),
        )

    def test_reopen_preserves_deadline_and_is_not_payable_until_extend(self):
        self._expire_window()
        window = PaymentWindow.objects.get(booking=self.booking)
        original_deadline = window.deadline_at

        response = self._reopen()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["payment_window_status"], PaymentWindowStatus.OPEN
        )
        self.assertEqual(
            response.data["payment_window_deadline_at"],
            original_deadline.isoformat(),
        )
        self.assertFalse(response.data["payment_eligible"])

        window.refresh_from_db()
        self.booking.refresh_from_db()
        self.assertEqual(window.deadline_at, original_deadline)
        self.assertFalse(is_payment_eligible(self.booking))
        with self.assertRaises(PaymentNotEligible):
            assert_payment_eligible(self.booking)

        audit = AuditLog.objects.filter(
            action=PAYMENT_WINDOW_REOPEN_AUDIT_ACTION
        ).latest("created_at")
        self.assertEqual(audit.before["status"], PaymentWindowStatus.EXPIRED)
        self.assertEqual(audit.after["status"], PaymentWindowStatus.OPEN)
        self.assertEqual(audit.after["deadline_at"], original_deadline.isoformat())

    def test_reopen_409_when_not_expired(self):
        response = self._reopen()
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_extend_sets_future_deadline_and_enables_eligibility(self):
        self._expire_window()
        self._reopen()

        new_deadline = timezone.now() + timedelta(days=2)
        response = self._extend(new_deadline.isoformat())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["payment_eligible"])

        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.status, PaymentWindowStatus.OPEN)
        self.assertEqual(
            window.deadline_at.replace(microsecond=0),
            new_deadline.replace(microsecond=0),
        )
        self.booking.refresh_from_db()
        self.assertTrue(is_payment_eligible(self.booking))

        audit = AuditLog.objects.filter(
            action=PAYMENT_WINDOW_EXTEND_AUDIT_ACTION
        ).latest("created_at")
        self.assertIsNotNone(audit.after["deadline_at"])

    def test_extend_400_when_deadline_not_future(self):
        past = timezone.now() - timedelta(hours=1)
        response = self._extend(past.isoformat())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deadline_at", response.data)