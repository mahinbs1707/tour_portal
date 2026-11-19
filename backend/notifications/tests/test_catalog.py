"""Notification catalog deeplinks (Story 9.1)."""

from __future__ import annotations

import uuid
from unittest import TestCase

from notifications.catalog import resolve_customer_deeplink


class NotificationCatalogTests(TestCase):
    def test_custom_tour_entity_id_strips_cycle_suffix(self):
        tour_id = uuid.uuid4()
        link = resolve_customer_deeplink(
            event_key="custom_tour.resubmitted",
            entity_type="custom_tour",
            entity_id=f"{tour_id}:3",
            payload={"title": "Trek"},
        )
        self.assertEqual(link, f"/app/customer/custom-tours/{tour_id}")

    def test_booking_approved_links_to_pay(self):
        booking_id = uuid.uuid4()
        link = resolve_customer_deeplink(
            event_key="booking.approved",
            entity_type="booking",
            entity_id=str(booking_id),
            payload={"reference": "BR-1"},
        )
        self.assertEqual(link, f"/app/customer/bookings/{booking_id}/pay")

    def test_payment_failed_links_to_pay_via_payload(self):
        booking_id = uuid.uuid4()
        payment_id = uuid.uuid4()
        link = resolve_customer_deeplink(
            event_key="payment.failed",
            entity_type="payment",
            entity_id=str(payment_id),
            payload={"booking_id": str(booking_id), "reference": "BR-2"},
        )
        self.assertEqual(link, f"/app/customer/bookings/{booking_id}/pay")

    def test_payment_success_links_to_booking_detail(self):
        booking_id = uuid.uuid4()
        link = resolve_customer_deeplink(
            event_key="payment.success",
            entity_type="payment",
            entity_id=str(uuid.uuid4()),
            payload={"booking_id": str(booking_id)},
        )
        self.assertEqual(link, f"/app/customer/bookings/{booking_id}")