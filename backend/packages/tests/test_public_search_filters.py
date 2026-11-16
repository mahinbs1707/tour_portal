"""Public catalog server-side search and filters (Story 3.4)."""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from packages.models import PackageStatus, TourPackage

User = get_user_model()

BASE = {
    "short_description": "Coastal calm weekend.",
    "full_description": "Two nights by the bay with guided walks.",
    "duration_nights": 2,
    "starting_location": "Dhaka",
    "currency": "BDT",
    "included_services": "Hotel, breakfast",
    "excluded_services": "Flights",
    "itinerary": "Day 1 arrive. Day 2 beach. Day 3 depart.",
    "cover_image": "/media/packages/cover.jpg",
}


class PublicSearchFilterAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email="customer-search@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )

    def _create(self, *, status_value=PackageStatus.PUBLISHED, **overrides):
        data = {**BASE, **overrides}
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
            cover_image=data.get("cover_image", "/media/packages/cover.jpg"),
            is_featured=bool(data.get("is_featured", False)),
        )

    def test_free_text_matches_title_destination_descriptions_case_insensitive(self):
        title_hit = self._create(
            title="Sundarbans Adventure",
            destinations="Khulna",
            short_description="Mangrove trails",
            full_description="Boat safari package",
            duration_days=4,
            base_price="18000.00",
        )
        dest_hit = self._create(
            title="Quiet Escape",
            destinations="Sundarbans South",
            short_description="Calm nights",
            full_description="Local cuisine",
            duration_days=3,
            base_price="12000.00",
        )
        short_hit = self._create(
            title="Delta Walk",
            destinations="Barisal",
            short_description="See the sundarbans fringe",
            full_description="Day hike",
            duration_days=2,
            base_price="8000.00",
        )
        full_hit = self._create(
            title="Bay Tour",
            destinations="Patuakhali",
            short_description="Seashells",
            full_description="Includes a Sundarbans briefing",
            duration_days=5,
            base_price="15000.00",
        )
        self._create(
            title="Cox Escape",
            destinations="Cox's Bazar",
            short_description="Beach",
            full_description="Surf and sand",
            duration_days=3,
            base_price="10000.00",
        )

        response = self.client.get("/api/packages/", {"q": "sundarbans"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data["results"]}
        self.assertEqual(
            ids,
            {
                str(title_hit.id),
                str(dest_hit.id),
                str(short_hit.id),
                str(full_hit.id),
            },
        )

    def test_destination_min_max_price_duration_combine_with_and(self):
        match = self._create(
            title="Sylhet Tea Trails",
            destinations="Sylhet Hills",
            duration_days=3,
            base_price="11000.00",
        )
        self._create(
            title="Wrong Destination",
            destinations="Bandarban",
            duration_days=3,
            base_price="11000.00",
        )
        self._create(
            title="Price Too Low",
            destinations="Sylhet Town",
            duration_days=3,
            base_price="5000.00",
        )
        self._create(
            title="Price Too High",
            destinations="Sylhet Lake",
            duration_days=3,
            base_price="20000.00",
        )
        self._create(
            title="Wrong Duration",
            destinations="Sylhet Valley",
            duration_days=5,
            base_price="11000.00",
        )
        self._create(
            title="Text Mismatch",
            destinations="Sylhet Hills",
            duration_days=3,
            base_price="11000.00",
            short_description="Quiet lakeside",
            full_description="No matching keywords in this copy",
        )

        response = self.client.get(
            "/api/packages/",
            {
                "q": "tea",
                "destination": "sylhet",
                "min_price": "10000",
                "max_price": "15000",
                "duration_days": "3",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(match.id))

    def test_draft_matching_text_is_excluded(self):
        draft = self._create(
            status_value=PackageStatus.DRAFT,
            title="Hidden Sundarbans Draft",
            destinations="Sundarbans",
            duration_days=3,
            base_price="9000.00",
        )
        published = self._create(
            title="Open Sundarbans",
            destinations="Khulna",
            duration_days=3,
            base_price="9000.00",
        )
        response = self.client.get("/api/packages/", {"q": "Sundarbans"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(published.id)])
        self.assertNotIn(str(draft.id), ids)

    def test_no_match_returns_empty_results(self):
        self._create(
            title="Cox Escape",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
        )
        response = self.client.get(
            "/api/packages/",
            {"q": "nowhere-land", "destination": "Mars"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_invalid_price_and_duration_return_400_field_errors(self):
        bad_min = self.client.get("/api/packages/", {"min_price": "abc"})
        self.assertEqual(bad_min.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("min_price", bad_min.data)

        bad_max = self.client.get("/api/packages/", {"max_price": "nope"})
        self.assertEqual(bad_max.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("max_price", bad_max.data)

        bad_duration = self.client.get("/api/packages/", {"duration_days": "3.5"})
        self.assertEqual(bad_duration.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("duration_days", bad_duration.data)

        inverted = self.client.get(
            "/api/packages/",
            {"min_price": "20000", "max_price": "10000"},
        )
        self.assertEqual(inverted.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("min_price", inverted.data)
        self.assertIn("max_price", inverted.data)

    def test_negative_zero_duration_and_non_finite_price_return_400(self):
        for raw in ("0", "-1"):
            response = self.client.get("/api/packages/", {"duration_days": raw})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("duration_days", response.data)

        for field, raw in (
            ("min_price", "-10"),
            ("max_price", "-0.01"),
            ("min_price", "Infinity"),
            ("max_price", "-Infinity"),
            ("min_price", "NaN"),
        ):
            response = self.client.get("/api/packages/", {field: raw})
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                msg=f"{field}={raw}",
            )
            self.assertIn(field, response.data)

    def test_like_metacharacters_do_not_act_as_wildcards(self):
        plain = self._create(
            title="Alpha Tour",
            destinations="Bandarban",
            duration_days=3,
            base_price="9000.00",
        )
        percent = self._create(
            title="100% Coastal",
            destinations="Cox% Bazar",
            duration_days=3,
            base_price="9000.00",
        )
        underscore = self._create(
            title="Tea_Trails",
            destinations="Sylhet_Hills",
            duration_days=3,
            base_price="9000.00",
        )

        wild_q = self.client.get("/api/packages/", {"q": "%"})
        self.assertEqual(wild_q.status_code, status.HTTP_200_OK)
        wild_q_ids = {row["id"] for row in wild_q.data["results"]}
        self.assertIn(str(percent.id), wild_q_ids)
        self.assertNotIn(str(plain.id), wild_q_ids)
        self.assertNotIn(str(underscore.id), wild_q_ids)

        wild_dest = self.client.get("/api/packages/", {"destination": "_"})
        self.assertEqual(wild_dest.status_code, status.HTTP_200_OK)
        wild_dest_ids = {row["id"] for row in wild_dest.data["results"]}
        self.assertIn(str(underscore.id), wild_dest_ids)
        self.assertNotIn(str(plain.id), wild_dest_ids)
        self.assertNotIn(str(percent.id), wild_dest_ids)

    def test_single_sided_min_or_max_price(self):
        low = self._create(
            title="Budget Walk",
            destinations="Dhaka",
            duration_days=2,
            base_price="5000.00",
        )
        mid = self._create(
            title="Mid Walk",
            destinations="Dhaka",
            duration_days=2,
            base_price="10000.00",
        )
        high = self._create(
            title="Premium Walk",
            destinations="Dhaka",
            duration_days=2,
            base_price="20000.00",
        )

        min_only = self.client.get("/api/packages/", {"min_price": "10000"})
        self.assertEqual(min_only.status_code, status.HTTP_200_OK)
        min_ids = {row["id"] for row in min_only.data["results"]}
        self.assertEqual(min_ids, {str(mid.id), str(high.id)})
        self.assertNotIn(str(low.id), min_ids)

        max_only = self.client.get("/api/packages/", {"max_price": "10000"})
        self.assertEqual(max_only.status_code, status.HTTP_200_OK)
        max_ids = {row["id"] for row in max_only.data["results"]}
        self.assertEqual(max_ids, {str(low.id), str(mid.id)})
        self.assertNotIn(str(high.id), max_ids)

    def test_unauthenticated_search_allowed(self):
        pkg = self._create(
            title="Guest Visible Tour",
            destinations="Dhaka",
            duration_days=2,
            base_price="7000.00",
        )
        response = self.client.get("/api/packages/", {"q": "Guest Visible"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(pkg.id))

    def test_authenticated_customer_can_filter(self):
        pkg = self._create(
            title="Customer Filter Tour",
            destinations="Rangamati",
            duration_days=4,
            base_price="14000.00",
        )
        self.client.force_login(self.customer)
        response = self.client.get(
            "/api/packages/",
            {"destination": "rangamati", "duration_days": "4"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(pkg.id))

    def test_featured_param_still_works_without_search(self):
        featured = self._create(
            title="Featured Keep",
            destinations="Kuakata",
            duration_days=3,
            base_price="10000.00",
            is_featured=True,
        )
        self._create(
            title="Not Featured",
            destinations="Kuakata",
            duration_days=3,
            base_price="10000.00",
            is_featured=False,
        )
        response = self.client.get("/api/packages/", {"featured": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(featured.id)])

    def test_featured_combines_with_search_filters(self):
        featured_match = self._create(
            title="Featured Cox",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
            is_featured=True,
        )
        self._create(
            title="Featured Sylhet",
            destinations="Sylhet",
            duration_days=3,
            base_price="10000.00",
            is_featured=True,
        )
        self._create(
            title="Plain Cox",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
            is_featured=False,
        )
        response = self.client.get(
            "/api/packages/",
            {"featured": "true", "destination": "cox"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(ids, [str(featured_match.id)])
