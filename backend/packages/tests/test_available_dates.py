"""Available dates Admin matrix (Story 2.2)."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.validators import (
    ADVANCE_CALENDAR_DAYS,
    is_within_advance_window,
    min_bookable_date,
    today_in_business_tz,
)

User = get_user_model()

SEAT_TOKENS = ("seat", "capacity", "remaining", "slots")

PACKAGE_PAYLOAD = {
    "title": "Sundarbans Trail",
    "short_description": "Mangrove weekend.",
    "full_description": "Guided boat trails.",
    "destinations": "Khulna",
    "duration_days": 3,
    "duration_nights": 2,
    "starting_location": "Dhaka",
    "base_price": "18000.00",
    "currency": "BDT",
    "included_services": "Boat",
    "excluded_services": "Flights",
    "itinerary": "Day 1 depart.",
}


class AvailableDateAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            full_name="Ada",
            role=Role.ADMIN,
            is_staff=True,
        )
        self.package = TourPackage.objects.create(
            **{
                **PACKAGE_PAYLOAD,
                "base_price": "18000.00",
                "status": PackageStatus.DRAFT,
            }
        )
        self.far_date = (today_in_business_tz() + timedelta(days=21)).isoformat()

    def _headers(self):
        cookie = self.client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login_admin(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _login_customer(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "customer@example.com", "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_model_has_no_seat_fields(self):
        names = {f.name.lower() for f in AvailableDate._meta.get_fields()}
        for token in SEAT_TOKENS:
            self.assertFalse(any(token in name for name in names), names)

    def test_min_bookable_date_is_seven_days_ahead(self):
        as_of = today_in_business_tz()
        self.assertEqual(
            min_bookable_date(as_of=as_of),
            as_of + timedelta(days=ADVANCE_CALENDAR_DAYS),
        )
        near = as_of + timedelta(days=3)
        self.assertTrue(is_within_advance_window(near, as_of=as_of))
        far = as_of + timedelta(days=21)
        self.assertFalse(is_within_advance_window(far, as_of=as_of))

    def test_admin_add_date_writes_audit(self):
        self._login_admin()
        response = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_active"])
        date_id = response.data["id"]
        self.assertEqual(
            AuditLog.objects.filter(
                action="available_date.create", target_id=date_id
            ).count(),
            1,
        )

    def test_customer_denied_date_apis(self):
        self._login_admin()
        created = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        date_id = created.data["id"]
        self.client.logout()
        self.client.get("/api/auth/csrf/")
        self._login_customer()
        listing = self.client.get(f"/api/packages/admin/{self.package.id}/dates/")
        self.assertEqual(listing.status_code, status.HTTP_403_FORBIDDEN)
        create = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        self.assertEqual(create.status_code, status.HTTP_403_FORBIDDEN)
        delete = self.client.delete(
            f"/api/packages/admin/{self.package.id}/dates/{date_id}/",
            **self._headers(),
        )
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_unreferenced_date(self):
        self._login_admin()
        created = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        date_id = created.data["id"]
        deleted = self.client.delete(
            f"/api/packages/admin/{self.package.id}/dates/{date_id}/",
            **self._headers(),
        )
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AvailableDate.objects.filter(pk=date_id).exists())

    def test_delete_referenced_rejected_and_deactivate_succeeds(self):
        self._login_admin()
        created = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        date_id = created.data["id"]
        with patch.object(AvailableDate, "has_booking_references", return_value=True):
            deleted = self.client.delete(
                f"/api/packages/admin/{self.package.id}/dates/{date_id}/",
                **self._headers(),
            )
            self.assertEqual(deleted.status_code, status.HTTP_409_CONFLICT)
            self.assertTrue(AvailableDate.objects.filter(pk=date_id).exists())

        deactivated = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/{date_id}/deactivate/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(deactivated.status_code, status.HTTP_200_OK)
        self.assertFalse(deactivated.data["is_active"])
        self.assertTrue(AvailableDate.objects.filter(pk=date_id, is_active=False).exists())
        self.assertEqual(
            AuditLog.objects.filter(
                action="available_date.deactivate", target_id=date_id
            ).count(),
            1,
        )

    def test_duplicate_package_date_rejected(self):
        self._login_admin()
        first = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            f"/api/packages/admin/{self.package.id}/dates/",
            {"tour_date": self.far_date},
            format="json",
            **self._headers(),
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
