"""Public published-only catalog list (Story 3.1)."""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from packages.models import PackageStatus, TourPackage
from packages.serializers import PublicPackageCardSerializer
from packages.services import published
from packages.views import PACKAGE_LIST_PAGE_SIZE

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

CARD_FIELDS = {
    "id",
    "title",
    "cover_image",
    "short_description",
    "destinations",
    "duration_days",
    "duration_nights",
    "base_price",
    "currency",
}


class PublicCatalogAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
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
            status=status_value,
            cover_image=overrides.get("cover_image", "/media/packages/cover.jpg"),
        )

    def test_unauthenticated_list_returns_200(self):
        response = self.client.get("/api/packages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_empty_published_catalog(self):
        self._create_package(status_value=PackageStatus.DRAFT)
        response = self.client.get("/api/packages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_drafts_excluded_published_included(self):
        draft = self._create_package(
            status_value=PackageStatus.DRAFT, title="Draft Only"
        )
        published_pkg = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            title="Published Escape",
            cover_image="/media/packages/pub-cover.jpg",
        )
        response = self.client.get("/api/packages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        ids = [row["id"] for row in response.data["results"]]
        self.assertIn(str(published_pkg.id), ids)
        self.assertNotIn(str(draft.id), ids)

    def test_authenticated_customer_and_admin_see_published_only(self):
        draft = self._create_package(
            status_value=PackageStatus.DRAFT, title="Still Draft"
        )
        published_pkg = self._create_package(
            status_value=PackageStatus.PUBLISHED, title="Public Tour"
        )
        for user in (self.customer, self.admin):
            self.client.force_login(user)
            response = self.client.get("/api/packages/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            ids = [row["id"] for row in response.data["results"]]
            self.assertEqual(ids, [str(published_pkg.id)])
            self.assertNotIn(str(draft.id), ids)
            self.client.logout()

    def test_card_fields_present_and_scoped(self):
        pkg = self._create_package(
            status_value=PackageStatus.PUBLISHED,
            title="Card Fields Tour",
        )
        response = self.client.get("/api/packages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["results"][0]
        self.assertEqual(set(row.keys()), CARD_FIELDS)
        self.assertEqual(row["id"], str(pkg.id))
        self.assertEqual(row["title"], "Card Fields Tour")
        self.assertEqual(row["cover_image"], "/media/packages/cover.jpg")
        self.assertEqual(row["short_description"], VALID_PAYLOAD["short_description"])
        self.assertEqual(row["destinations"], VALID_PAYLOAD["destinations"])
        self.assertEqual(row["duration_days"], 3)
        self.assertEqual(row["duration_nights"], 2)
        self.assertEqual(Decimal(row["base_price"]), Decimal("12500.00"))
        self.assertEqual(row["currency"], "BDT")
        for admin_only in (
            "full_description",
            "status",
            "is_featured",
            "included_services",
            "itinerary",
        ):
            self.assertNotIn(admin_only, row)

    def test_published_helper_matches_queryset(self):
        self._create_package(status_value=PackageStatus.DRAFT)
        pub = self._create_package(status_value=PackageStatus.PUBLISHED)
        qs = published()
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.get().id, pub.id)

    def test_public_serializer_is_read_only_card_scoped(self):
        fields = PublicPackageCardSerializer().fields
        self.assertEqual(set(fields.keys()), CARD_FIELDS)
        for name, field in fields.items():
            self.assertTrue(field.read_only, msg=f"{name} must be read-only")

    def test_page_size_constant_matches_admin_default(self):
        self.assertEqual(PACKAGE_LIST_PAGE_SIZE, 20)

    def test_pagination_page_two(self):
        for i in range(PACKAGE_LIST_PAGE_SIZE + 1):
            self._create_package(
                status_value=PackageStatus.PUBLISHED,
                title=f"Tour {i}",
            )
        page1 = self.client.get("/api/packages/")
        self.assertEqual(page1.status_code, status.HTTP_200_OK)
        self.assertEqual(page1.data["count"], PACKAGE_LIST_PAGE_SIZE + 1)
        self.assertEqual(len(page1.data["results"]), PACKAGE_LIST_PAGE_SIZE)
        self.assertIsNotNone(page1.data["next"])

        page2 = self.client.get("/api/packages/?page=2")
        self.assertEqual(page2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page2.data["results"]), 1)
        self.assertIsNotNone(page2.data["previous"])
