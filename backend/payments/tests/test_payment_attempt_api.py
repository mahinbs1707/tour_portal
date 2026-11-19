"""Customer mock payment attempt API (Story 7.1)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from bookings.models import BookingStatus
from bookings.services import BookingService
from notifications.models import Notification
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import Payment, PaymentStatus, PaymentWindowStatus
from payments.services import PaymentAlreadySucceeded, PaymentService

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


class PaymentAttemptSetupMixin:
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
        self.booking = BookingService().create(
            customer=self.customer,
            package_id=self.package.id,
            available_date_id=self.available_date.id,
            travelers=2,
            contact_name="Contact Person",
            contact_email="contact@example.com",
            contact_phone="+8801700000000",
        )
        self.booking = BookingService().approve(
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

    def _attempt(self, outcome: str, booking_id=None):
        booking_id = booking_id or self.booking.id
        return self.client.post(
            f"/api/bookings/{booking_id}/payments/attempt/",
            {"outcome": outcome},
            format="json",
            **self._headers(),
        )


class PaymentAttemptAPITests(PaymentAttemptSetupMixin, APITestCase):
    def test_success_when_eligible(self):
        self._login(self.customer.email)
        before = Payment.objects.filter(booking=self.booking).count()
        response = self._attempt("SUCCESS")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], PaymentStatus.SUCCESS)
        self.assertEqual(Payment.objects.filter(booking=self.booking).count(), before + 1)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.APPROVED)
        self.assertTrue(
            Notification.objects.filter(
                recipient_id=self.customer.id, event_key="payment.success"
            ).exists()
        )

    def test_second_success_returns_409(self):
        self._login(self.customer.email)
        self._attempt("SUCCESS")
        response = self._attempt("SUCCESS")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            Payment.objects.filter(
                booking=self.booking, status=PaymentStatus.SUCCESS
            ).count(),
            1,
        )

    def test_failed_creates_row_and_notifies(self):
        self._login(self.customer.email)
        response = self._attempt("FAILED")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient_id=self.customer.id, event_key="payment.failed"
            ).exists()
        )

    def test_cancelled_no_notification(self):
        self._login(self.customer.email)
        response = self._attempt("CANCELLED")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            Notification.objects.filter(
                recipient_id=self.customer.id,
                event_key__in=("payment.success", "payment.failed"),
            ).exists()
        )

    def test_ineligible_pending_booking_403(self):
        pending = BookingService().create(
            customer=self.customer,
            package_id=self.package.id,
            available_date_id=self.available_date.id,
            travelers=1,
            contact_name="A",
            contact_email="a@example.com",
            contact_phone="+8801700000001",
        )
        self._login(self.customer.email)
        response = self._attempt("SUCCESS", booking_id=pending.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_foreign_booking_404(self):
        self._login(self.customer.email)
        other_booking = BookingService().create(
            customer=self.other,
            package_id=self.package.id,
            available_date_id=self.available_date.id,
            travelers=1,
            contact_name="B",
            contact_email="b@example.com",
            contact_phone="+8801700000002",
        )
        response = self._attempt("SUCCESS", booking_id=other_booking.id)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_latest_payment_status_on_detail(self):
        self._login(self.customer.email)
        self._attempt("FAILED")
        detail = self.client.get(
            f"/api/bookings/{self.booking.id}/", **self._headers()
        )
        self.assertEqual(detail.data["payment_status"], PaymentStatus.FAILED)


class PaymentServiceAttemptUnitTests(PaymentAttemptSetupMixin, APITestCase):
    def test_db_unique_constraint_blocks_second_success_row(self):
        service = PaymentService()
        service.record_mock_attempt(
            self.booking, customer=self.customer, outcome="SUCCESS"
        )
        with self.assertRaises(IntegrityError):
            Payment.objects.create(
                booking=self.booking,
                status=PaymentStatus.SUCCESS,
                amount=self.package.base_price,
                currency=self.package.currency,
            )
    def test_service_raises_when_already_success(self):
        service = PaymentService()
        with transaction.atomic():
            service.record_mock_attempt(
                self.booking, customer=self.customer, outcome="SUCCESS"
            )
        with self.assertRaises(PaymentAlreadySucceeded):
            service.record_mock_attempt(
                self.booking, customer=self.customer, outcome="SUCCESS"
            )