"""Booking create API matrix (Story 5.1)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from bookings.models import Booking, BookingStatus
from bookings.services import REFERENCE_HEX_LEN, reference_from_uuid
from notifications.models import Notification
from notifications.services import NotificationService
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import Payment, PaymentStatus, PaymentWindow, PaymentWindowStatus
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


class BookingCreateAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value

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
        self.as_of = today_in_business_tz()
        self.min_bookable = min_bookable_date(as_of=self.as_of)
        self.far_date = self.min_bookable + timedelta(days=7)
        self.near_date = self.as_of + timedelta(days=3)

        self.package = TourPackage.objects.create(
            **PACKAGE_FIELDS,
            status=PackageStatus.PUBLISHED,
        )
        self.available_date = AvailableDate.objects.create(
            package=self.package,
            tour_date=self.far_date,
            is_active=True,
        )
        self.draft_package = TourPackage.objects.create(
            **{**PACKAGE_FIELDS, "title": "Draft Only"},
            status=PackageStatus.DRAFT,
        )
        self.draft_date = AvailableDate.objects.create(
            package=self.draft_package,
            tour_date=self.far_date,
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

    def _valid_payload(self, **overrides):
        payload = {
            "package_id": str(self.package.id),
            "available_date_id": str(self.available_date.id),
            "travelers": 2,
            "contact_name": "Casey Customer",
            "contact_email": "customer@example.com",
            "contact_phone": "+8801700000000",
            "additional_requirements": "Vegetarian meals",
        }
        payload.update(overrides)
        return payload

    def test_happy_path_creates_pending_window_unpaid_and_notification(self):
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], BookingStatus.PENDING)
        reference = response.data["reference"]
        self.assertEqual(len(reference), REFERENCE_HEX_LEN)
        self.assertTrue(all(ch in "0123456789ABCDEF" for ch in reference))
        self.assertEqual(response.data["payment_status"], PaymentStatus.UNPAID)
        self.assertEqual(
            response.data["payment_window_status"],
            PaymentWindowStatus.NOT_OPEN,
        )

        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.reference, reference)
        self.assertEqual(booking.reference, reference_from_uuid(booking.id))
        self.assertEqual(PaymentWindow.objects.filter(booking=booking).count(), 1)
        self.assertEqual(
            Payment.objects.filter(booking=booking, status=PaymentStatus.UNPAID).count(),
            1,
        )
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.customer,
                event_key="booking.submitted",
                entity_type="booking",
                entity_id=str(booking.id),
            ).count(),
            1,
        )

    def test_notification_idempotent_on_retry(self):
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        booking_id = response.data["id"]
        service = NotificationService()
        first = service.create(
            recipient_id=self.customer.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=booking_id,
            payload={"reference": response.data["reference"]},
        )
        second = service.create(
            recipient_id=self.customer.id,
            event_key="booking.submitted",
            entity_type="booking",
            entity_id=booking_id,
            payload={"reference": response.data["reference"]},
        )
        self.assertEqual(first.id, second.id)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.customer,
                event_key="booking.submitted",
                entity_type="booking",
                entity_id=str(booking_id),
            ).count(),
            1,
        )

    def test_date_within_seven_days_rejected_with_no_rows(self):
        near = AvailableDate.objects.create(
            package=self.package,
            tour_date=self.near_date,
            is_active=True,
        )
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(available_date_id=str(near.id)),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("available_date_id", response.data)
        self.assertEqual(Booking.objects.count(), 0)
        self.assertEqual(PaymentWindow.objects.count(), 0)
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_guest_denied(self):
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertEqual(Booking.objects.count(), 0)

    def test_admin_denied(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        denied = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Booking.objects.count(), 0)

    def test_cross_package_available_date_rejected(self):
        other_package = TourPackage.objects.create(
            **{**PACKAGE_FIELDS, "title": "Other Published"},
            status=PackageStatus.PUBLISHED,
        )
        other_date = AvailableDate.objects.create(
            package=other_package,
            tour_date=self.far_date,
            is_active=True,
        )
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(available_date_id=str(other_date.id)),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("available_date_id", response.data)
        self.assertEqual(Booking.objects.count(), 0)
        self.assertEqual(PaymentWindow.objects.count(), 0)
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_unpublished_package_rejected(self):
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(
                package_id=str(self.draft_package.id),
                available_date_id=str(self.draft_date.id),
            ),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Booking.objects.count(), 0)
        self.assertEqual(PaymentWindow.objects.count(), 0)

    def test_inactive_date_rejected(self):
        self.available_date.is_active = False
        self.available_date.save(update_fields=["is_active", "updated_at"])
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Booking.objects.count(), 0)

    def test_travelers_zero_rejected_and_one_accepted(self):
        self._login_customer()
        rejected = self.client.post(
            "/api/bookings/",
            self._valid_payload(travelers=0),
            format="json",
            **self._headers(),
        )
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("travelers", rejected.data)

        accepted = self.client.post(
            "/api/bookings/",
            self._valid_payload(travelers=1),
            format="json",
            **self._headers(),
        )
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertEqual(accepted.data["travelers"], 1)

    def test_missing_contact_fields_rejected(self):
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(contact_name="", contact_phone=""),
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contact_name", response.data)
        self.assertIn("contact_phone", response.data)
        self.assertEqual(Booking.objects.count(), 0)

    def test_payment_window_unique_per_booking(self):
        self._login_customer()
        response = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        booking = Booking.objects.get(id=response.data["id"])
        with self.assertRaises(ValueError):
            PaymentService().create_not_open_for_booking(booking)
        self.assertEqual(PaymentWindow.objects.filter(booking=booking).count(), 1)

    def test_atomic_failure_rolls_back_booking_and_window(self):
        self._login_customer()

        class BoomPayments(PaymentService):
            def create_not_open_for_booking(self, booking):
                raise RuntimeError("payment boom")

        from bookings.services import BookingService

        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                BookingService(payments=BoomPayments()).create(
                    customer=self.customer,
                    package_id=self.package.id,
                    available_date_id=self.available_date.id,
                    travelers=2,
                    contact_name="Casey",
                    contact_email="customer@example.com",
                    contact_phone="+8801700000000",
                )
        self.assertEqual(Booking.objects.count(), 0)
        self.assertEqual(PaymentWindow.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_concurrent_bookings_same_date_allowed(self):
        other = User.objects.create_user(
            email="other@example.com",
            password="SecurePass1",
            full_name="Other Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self._login_customer()
        first = self.client.post(
            "/api/bookings/",
            self._valid_payload(),
            format="json",
            **self._headers(),
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        from bookings.services import BookingService

        second = BookingService().create(
            customer=other,
            package_id=self.package.id,
            available_date_id=self.available_date.id,
            travelers=3,
            contact_name="Other Customer",
            contact_email="other@example.com",
            contact_phone="+8801711111111",
        )
        self.assertEqual(Booking.objects.filter(available_date=self.available_date).count(), 2)
        self.assertNotEqual(first.data["reference"], second.reference)
