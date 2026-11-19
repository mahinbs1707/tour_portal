"""Payment eligibility helper (Story 6.4)."""

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
from payments.eligibility import PaymentNotEligible, assert_payment_eligible, is_payment_eligible
from payments.models import Payment, PaymentStatus, PaymentWindow, PaymentWindowStatus
from payments.services import PaymentService

User = get_user_model()


class PaymentEligibilityTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="elig@example.com",
            password="SecurePass1",
            full_name="Elig Customer",
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
            status=BookingStatus.APPROVED,
            travelers=2,
            contact_name="Elig Customer",
            contact_email="elig@example.com",
            contact_phone="+8801700000001",
            approved_at=timezone.now(),
        )
        self.payments = PaymentService()
        self.payments.create_not_open_for_booking(self.booking)

    def test_not_eligible_when_reopened_with_past_deadline(self):
        opened_at = timezone.now() - timedelta(hours=30)
        window = self.payments.open_window_for_booking(self.booking, opened_at=opened_at)
        self.payments.mark_expired_if_past_deadline(
            self.booking, now=window.deadline_at + timedelta(hours=1)
        )
        self.payments.reopen_window_for_booking(self.booking)
        self.assertFalse(is_payment_eligible(self.booking))

    def test_eligible_when_open_and_deadline_future(self):
        self.payments.open_window_for_booking(self.booking, opened_at=timezone.now())
        self.booking.refresh_from_db()
        window = PaymentWindow.objects.get(booking=self.booking)
        self.assertEqual(window.status, PaymentWindowStatus.OPEN)
        self.assertGreater(window.deadline_at, timezone.now())
        self.assertTrue(is_payment_eligible(self.booking))

    def test_assert_raises_when_ineligible(self):
        opened_at = timezone.now() - timedelta(hours=30)
        self.payments.open_window_for_booking(self.booking, opened_at=opened_at)
        with self.assertRaises(PaymentNotEligible):
            assert_payment_eligible(self.booking)

    def test_not_eligible_after_success_payment(self):
        self.payments.open_window_for_booking(self.booking, opened_at=timezone.now())
        payment = Payment.objects.get(booking=self.booking)
        payment.status = PaymentStatus.SUCCESS
        payment.save(update_fields=["status"])
        self.assertFalse(is_payment_eligible(self.booking))