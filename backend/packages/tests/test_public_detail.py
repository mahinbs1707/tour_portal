"""Public published-only package detail + bookability (Story 3.2)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.serializers import PublicPackageDetailSerializer
from packages.services import UNAVAILABLE_NO_QUALIFYING_DATES, compute_bookability
from packages.validators import min_bookable_date, today_in_business_tz

User = get_user_model()

VALID_PAYLOAD = {
    "title": "Cox's Bazar Escape",
    "short_description": "Coastal calm weekend.",
    "full_description": "Two nights by the bay with guided walks.",
    "destinations": "Cox's Bazar",
    "duration_days": 3,
    "duration_nights": 2,
    "starting_location": "Dhaka",
    "base_price": "12500.00",
    "currency": "bdt",
    "included_services": "Hotel, breakfast",
    "excluded_services": "Flights",
    "itinerary": "Day 1 arrive. Day 2 beach. Day 3 depart.",
    "difficulty": "Easy",
    "cancellation_policy": "Free cancel 14 days prior.",
    "additional_info": "Bring sunscreen.",
}

DETAIL_FIELDS = {
    "id",
    "title",
    "cover_image",
    "additional_images",
    "short_description",
    "full_description",
    "destinations",
    "duration_days",
    "duration_nights",
    "starting_location",
    "available_dates",
    "difficulty",
    "base_price",
    "currency",
    "included_services",
    "excluded_services",
    "itinerary",
    "cancellation_policy",
    "additional_info",
    "is_bookable",
    "unavailable_reason",
}


class PublicPackageDetailAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.as_of = today_in_business_tz()
        self.min_bookable = min_bookable_date(as_of=self.as_of)
        self.far_date = self.min_bookable + timedelta(days=7)
        self.near_date = self.as_of + timedelta(days=3)

    def _create_package(self, *, status_value=PackageStatus.DRAFT, **overrides):
        data = {**VALID_PAYLOAD, **overrides}
        return TourPackage.objects.create(
            title=data["title"],
            short_description=data["short_description"],
            full_description=data["full_description"],
            destinations=data["destinations"],
            duration_days=data["duration_days"],
            duration_nights=data["duration_nights"],
            starting_location=data["starting_location"],
            base_price=Decimal(str(data["base_price"])),
            currency=str(data["currency"]).strip().upper(),
            included_services=data["included_services"],
            excluded_services=data["excluded_services"],
            itinerary=data["itinerary"],
            difficulty=data.get("difficulty", ""),
            cancellation_policy=data.get("cancellation_policy", ""),
            additional_info=data.get("additional_info", ""),
            status=status_value,
            cover_image=overrides.get("cover_image", "/media/packages/cover.jpg"),
            additional_images=overrides.get(
                "additional_images",
                ["/media/packages/extra-1.jpg"],
            ),
        )

    def _add_date(self, package, tour_date, *, is_active=True):
        return AvailableDate.objects.create(
            package=package,
            tour_date=tour_date,
            is_active=is_active,
        )

    def test_unauthenticated_detail_returns_200_for_bookable_published(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        self._add_date(pkg, self.far_date)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            response = self.client.get(f"/api/packages/{pkg.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(pkg.id))
        self.assertTrue(response.data["is_bookable"])
        self.assertIsNone(response.data["unavailable_reason"])
        self.assertEqual(set(response.data.keys()), DETAIL_FIELDS)
        self.assertEqual(response.data["title"], VALID_PAYLOAD["title"])
        self.assertEqual(response.data["full_description"], VALID_PAYLOAD["full_description"])
        self.assertEqual(response.data["starting_location"], VALID_PAYLOAD["starting_location"])
        self.assertEqual(response.data["included_services"], VALID_PAYLOAD["included_services"])
        self.assertEqual(response.data["excluded_services"], VALID_PAYLOAD["excluded_services"])
        self.assertEqual(response.data["itinerary"], VALID_PAYLOAD["itinerary"])
        self.assertEqual(response.data["difficulty"], VALID_PAYLOAD["difficulty"])
        self.assertEqual(
            response.data["cancellation_policy"],
            VALID_PAYLOAD["cancellation_policy"],
        )
        self.assertEqual(response.data["additional_info"], VALID_PAYLOAD["additional_info"])
        self.assertEqual(response.data["currency"], "BDT")
        self.assertEqual(Decimal(response.data["base_price"]), Decimal("12500.00"))
        self.assertEqual(len(response.data["available_dates"]), 1)
        self.assertEqual(
            response.data["available_dates"][0]["tour_date"],
            self.far_date.isoformat(),
        )
        self.assertNotIn("status", response.data)
        self.assertNotIn("is_featured", response.data)

    def test_published_not_bookable_when_no_active_dates(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            response = self.client.get(f"/api/packages/{pkg.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_bookable"])
        self.assertEqual(
            response.data["unavailable_reason"],
            UNAVAILABLE_NO_QUALIFYING_DATES,
        )
        self.assertEqual(response.data["available_dates"], [])

    def test_published_not_bookable_when_only_near_term_or_inactive(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        self._add_date(pkg, self.near_date, is_active=True)
        self._add_date(pkg, self.far_date, is_active=False)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            response = self.client.get(f"/api/packages/{pkg.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_bookable"])
        self.assertEqual(
            response.data["unavailable_reason"],
            UNAVAILABLE_NO_QUALIFYING_DATES,
        )
        # Active near-term date still listed; inactive far date omitted.
        self.assertEqual(len(response.data["available_dates"]), 1)
        self.assertEqual(
            response.data["available_dates"][0]["tour_date"],
            self.near_date.isoformat(),
        )

    def test_draft_detail_returns_404(self):
        draft = self._create_package(status_value=PackageStatus.DRAFT)
        self._add_date(draft, self.far_date)
        response = self.client.get(f"/api/packages/{draft.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_id_returns_404(self):
        response = self.client.get(
            "/api/packages/00000000-0000-0000-0000-000000000099/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_authenticated_customer_can_read_published_detail(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        self._add_date(pkg, self.far_date)
        self.client.force_login(self.customer)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            response = self.client.get(f"/api/packages/{pkg.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_bookable"])

    def test_compute_bookability_requires_active_date_on_or_after_min(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        self._add_date(pkg, self.near_date)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            bookable, reason = compute_bookability(pkg, as_of=self.as_of)
        self.assertFalse(bookable)
        self.assertEqual(reason, UNAVAILABLE_NO_QUALIFYING_DATES)

        self._add_date(pkg, self.min_bookable)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            bookable, reason = compute_bookability(pkg, as_of=self.as_of)
        self.assertTrue(bookable)
        self.assertIsNone(reason)

    def test_detail_serializer_fields_are_read_only(self):
        fields = PublicPackageDetailSerializer().fields
        self.assertEqual(set(fields.keys()), DETAIL_FIELDS)
        for name, field in fields.items():
            self.assertTrue(field.read_only, msg=f"{name} must be read-only")

    def test_active_dates_returned_in_ascending_tour_date_order(self):
        pkg = self._create_package(status_value=PackageStatus.PUBLISHED)
        later = self.min_bookable + timedelta(days=14)
        earlier = self.min_bookable + timedelta(days=7)
        # Insert later first to prove response order is not insertion order.
        self._add_date(pkg, later)
        self._add_date(pkg, earlier)
        with patch(
            "packages.services.min_bookable_date",
            return_value=self.min_bookable,
        ):
            response = self.client.get(f"/api/packages/{pkg.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dates = [row["tour_date"] for row in response.data["available_dates"]]
        self.assertEqual(dates, [earlier.isoformat(), later.isoformat()])
        self.assertTrue(response.data["is_bookable"])
