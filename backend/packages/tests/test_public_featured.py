"""Public featured published-only list filter (Story 3.3)."""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from packages.models import PackageStatus, TourPackage
from packages.services import featured_published, published

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
}


class PublicFeaturedAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )

    def _create_package(
        self,
        *,
        status_value=PackageStatus.DRAFT,
        is_featured=False,
        **overrides,
    ):
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
            status=status_value,
            is_featured=is_featured,
            cover_image=overrides.get("cover_image", "/media/packages/cover.jpg"),
        )

    def test_featured_true_returns_only_published_featured(self):
        featured = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=True,
            title="Featured Escape",
        )
        self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=False,
            title="Published Not Featured",
        )
        self._create_package(
            status_value=PackageStatus.DRAFT,
            is_featured=True,
            title="Draft Marked Featured",
        )

        response = self.client.get("/api/packages/?featured=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(featured.id)])
        self.assertNotIn("is_featured", response.data["results"][0])

    def test_featured_true_excludes_unpublished_even_if_flagged(self):
        draft = self._create_package(
            status_value=PackageStatus.DRAFT,
            is_featured=True,
            title="Invalid Draft Featured",
        )
        response = self.client.get("/api/packages/?featured=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])
        self.assertNotIn(str(draft.id), [row["id"] for row in response.data["results"]])

    def test_featured_true_empty_list_ok(self):
        self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=False,
            title="Only Non Featured",
        )
        response = self.client.get("/api/packages/?featured=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_featured_false_returns_published_non_featured(self):
        featured = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=True,
            title="Featured One",
        )
        plain = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=False,
            title="Plain Published",
        )
        response = self.client.get("/api/packages/?featured=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(plain.id)])
        self.assertNotIn(str(featured.id), ids)

    def test_invalid_featured_returns_400(self):
        response = self.client.get("/api/packages/?featured=maybe")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("featured", response.data)

    def test_unauthenticated_featured_allowed(self):
        self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=True,
            title="Public Featured",
        )
        response = self.client.get("/api/packages/?featured=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_authenticated_customer_sees_featured_published_only(self):
        featured = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=True,
            title="Featured For Customer",
        )
        self._create_package(
            status_value=PackageStatus.DRAFT,
            is_featured=True,
            title="Draft Featured",
        )
        self.client.force_login(self.customer)
        response = self.client.get("/api/packages/?featured=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(featured.id)])

    def test_featured_published_helper_matches_filter(self):
        featured = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=True,
        )
        self._create_package(
            status_value=PackageStatus.PUBLISHED,
            is_featured=False,
        )
        self._create_package(
            status_value=PackageStatus.DRAFT,
            is_featured=True,
        )
        qs = featured_published()
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().id, featured.id)
        self.assertEqual(published().count(), 2)
