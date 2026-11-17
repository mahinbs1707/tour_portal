"""PaymentService NOT_OPEN create (Story 5.1 / AD-16)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Role
from bookings.models import Booking, BookingStatus
from bookings.services import reference_from_uuid
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import min_bookable_date, today_in_business_tz
from payments.models import Payment, PaymentStatus, PaymentWindow, PaymentWindowStatus
from payments.services import (
    PaymentService,
    PaymentWindowMissing,
    PaymentWindowNotOpenable,
)

User = get_user_model()


class PaymentServiceTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="pay@example.com",
            password="SecurePass1",
            full_name="Pay Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        far = min_bookable_date(as_of=today_in_business_tz()) + timedelta(days=10)
        self.package = TourPackage.objects.create(
            title="Sylhet Hills",
            short_description="Tea gardens.",
            full_description="Guided walk.",
            destinations="Sylhet",
            duration_days=2,
            duration_nights=1,
            starting_location="Dhaka",
            base_price=Decimal("15000.00"),
            currency="BDT",
            included_services="Guide",
            excluded_services="Meals",
            itinerary="Day 1.",
            status=PackageStatus.PUBLISHED,
        )
        self.available_date = AvailableDate.objects.create(
            package=self.package,
            tour_date=far,
            is_active=True,
        )
        booking_id = __import__("uuid").uuid4()
        self.booking = Booking.objects.create(
            id=booking_id,
            reference=reference_from_uuid(booking_id),
            customer=self.customer,
            package=self.package,
            available_date=self.available_date,
            status=BookingStatus.PENDING,
            travelers=2,
            contact_name="Pay Customer",
            contact_email="pay@example.com",
            contact_phone="+8801700000001",
        )

    def test_create_not_open_creates_window_and_unpaid_payment(self):
        window = PaymentService().create_not_open_for_booking(self.booking)
        self.assertEqual(window.status, PaymentWindowStatus.NOT_OPEN)
        self.assertIsNone(window.opened_at)
        self.assertIsNone(window.deadline_at)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 1)
        payment = Payment.objects.get(booking=self.booking)
        self.assertEqual(payment.status, PaymentStatus.UNPAID)
        self.assertEqual(payment.amount, self.package.base_price)
        self.assertEqual(payment.currency, self.package.currency)

    def test_create_not_open_rejects_second_window(self):
        PaymentService().create_not_open_for_booking(self.booking)
        with self.assertRaises(ValueError):
            PaymentService().create_not_open_for_booking(self.booking)

    # --- open_window_for_booking (Story 6.2) -------------------------

    def test_open_window_updates_same_row_with_24h_deadline(self):
        created = PaymentService().create_not_open_for_booking(self.booking)
        opened_at = timezone.now()

        window = PaymentService().open_window_for_booking(
            self.booking, opened_at=opened_at
        )

        self.assertEqual(window.pk, created.pk)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 1)
        window.refresh_from_db()
        self.assertEqual(window.status, PaymentWindowStatus.OPEN)
        self.assertEqual(window.opened_at, opened_at)
        self.assertEqual(window.deadline_at, opened_at + timedelta(hours=24))
        # Payment ledger is untouched: still one UNPAID row.
        payment = Payment.objects.get(booking=self.booking)
        self.assertEqual(payment.status, PaymentStatus.UNPAID)

    def test_open_window_missing_row_raises_and_inserts_nothing(self):
        with self.assertRaises(PaymentWindowMissing):
            PaymentService().open_window_for_booking(
                self.booking, opened_at=timezone.now()
            )
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 0)

    def test_open_window_refuses_non_not_open_status(self):
        PaymentService().create_not_open_for_booking(self.booking)
        PaymentService().open_window_for_booking(self.booking, opened_at=timezone.now())
        before = PaymentWindow.objects.get(booking=self.booking)

        with self.assertRaises(PaymentWindowNotOpenable):
            PaymentService().open_window_for_booking(
                self.booking, opened_at=timezone.now() + timedelta(hours=5)
            )

        after = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(after.deadline_at, before.deadline_at)
        self.assertEqual(PaymentWindow.objects.filter(booking=self.booking).count(), 1)
