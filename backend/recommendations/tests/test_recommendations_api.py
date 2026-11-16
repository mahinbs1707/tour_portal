"""POST /api/recommendations/ — Story 4.1 acceptance matrix."""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from packages.models import PackageStatus, TourPackage
from recommendations.providers.base import RecommendationMatch
from recommendations.services import MAX_RESULTS

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
    "why",
}


class RecommendationAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value
        self.customer = User.objects.create_user(
            email="customer-recs@example.com",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )

    def _post(self, payload, *, include_csrf=True, client=None):
        client = client or self.client
        headers = {}
        if include_csrf:
            cookie = client.cookies.get("csrftoken")
            token = cookie.value if cookie else self.csrf_token
            headers["HTTP_X_CSRFTOKEN"] = token
        return client.post(
            "/api/recommendations/",
            payload,
            format="json",
            **headers,
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
        )

    def test_happy_path_returns_published_card_shaped_results(self):
        match = self._create(
            title="Sundarbans Adventure",
            destinations="Khulna Mangrove",
            duration_days=4,
            base_price="18000.00",
        )
        self._create(
            title="Cox Escape",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
        )

        response = self._post({"prompt": "I want a sundarbans mangrove trip"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"results"})
        self.assertGreaterEqual(len(response.data["results"]), 1)
        self.assertLessEqual(len(response.data["results"]), MAX_RESULTS)
        row = response.data["results"][0]
        self.assertEqual(set(row.keys()), CARD_FIELDS)
        self.assertEqual(row["id"], str(match.id))
        self.assertEqual(row["title"], "Sundarbans Adventure")
        self.assertEqual(row["currency"], "BDT")
        self.assertTrue(row["why"])
        self.assertNotIn("error", response.data)

    def test_guest_allow_any_without_session(self):
        self._create(
            title="Sylhet Tea Trails",
            destinations="Sylhet",
            duration_days=3,
            base_price="11000.00",
        )
        bare = APIClient(enforce_csrf_checks=True)
        csrf = bare.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        token = bare.cookies.get("csrftoken").value
        response = bare.post(
            "/api/recommendations/",
            {"prompt": "sylhet tea hills"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_requires_csrf(self):
        bare = APIClient(enforce_csrf_checks=True)
        response = bare.post(
            "/api/recommendations/",
            {"prompt": "beach weekend"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_match_returns_200_empty_results(self):
        self._create(
            title="Cox Escape",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
        )
        response = self._post({"prompt": "antarctica ice expedition"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"results": []})

    def test_drafts_only_never_returned(self):
        draft = self._create(
            title="Secret Draft Sundarbans",
            destinations="Sundarbans",
            duration_days=5,
            base_price="20000.00",
            status_value=PackageStatus.DRAFT,
        )
        response = self._post({"prompt": "sundarbans adventure"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"results": []})
        ids = {row["id"] for row in response.data["results"]}
        self.assertNotIn(str(draft.id), ids)

    def test_results_capped_at_five_published_only(self):
        for i in range(8):
            self._create(
                title=f"Beach Getaway {i}",
                destinations=f"Beach Coast {i}",
                short_description="sandy beach holiday",
                full_description="relaxing beach and ocean",
                duration_days=2 + i,
                base_price=f"{9000 + i}.00",
            )
        draft = self._create(
            title="Draft Beach Secret",
            destinations="Beach Hidden",
            short_description="beach draft",
            full_description="beach only draft",
            duration_days=9,
            base_price="5000.00",
            status_value=PackageStatus.DRAFT,
        )
        response = self._post({"prompt": "beach ocean holiday"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertLessEqual(len(results), MAX_RESULTS)
        self.assertEqual(len(results), MAX_RESULTS)
        ids = {row["id"] for row in results}
        self.assertNotIn(str(draft.id), ids)
        for row in results:
            self.assertEqual(set(row.keys()), CARD_FIELDS)

    def test_blank_prompt_400_no_provider_call(self):
        with patch(
            "recommendations.views.RecommendationService.recommend"
        ) as recommend:
            for payload in (
                {"prompt": ""},
                {"prompt": "   "},
                {"prompt": "\n\t"},
                {},
            ):
                response = self._post(payload)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                    msg=payload,
                )
                self.assertIn("prompt", response.data)
                self.assertNotIn("results", response.data)
                self.assertNotIn("error", response.data)
            recommend.assert_not_called()

    def test_overlong_prompt_400(self):
        response = self._post({"prompt": "x" * 2001})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prompt", response.data)
        self.assertNotIn("results", response.data)

    @override_settings(AI_PROVIDER_FORCE_FAIL="bad_response")
    def test_provider_bad_response_502(self):
        self._create(
            title="Sundarbans Adventure",
            destinations="Khulna",
            duration_days=4,
            base_price="18000.00",
        )
        response = self._post({"prompt": "sundarbans"})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            response.data,
            {
                "error": {
                    "code": "provider_bad_response",
                    "message": (
                        "The recommendation provider returned an invalid response."
                    ),
                }
            },
        )
        self.assertNotIn("results", response.data)
        body = str(response.data).lower()
        self.assertNotIn("traceback", body)
        self.assertNotIn("exception", body)

    @override_settings(AI_PROVIDER_FORCE_FAIL="unavailable")
    def test_provider_unavailable_503(self):
        self._create(
            title="Sundarbans Adventure",
            destinations="Khulna",
            duration_days=4,
            base_price="18000.00",
        )
        response = self._post({"prompt": "sundarbans"})
        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(
            response.data,
            {
                "error": {
                    "code": "provider_unavailable",
                    "message": (
                        "The recommendation provider is temporarily unavailable."
                    ),
                }
            },
        )
        self.assertNotIn("results", response.data)

    @override_settings(AI_PROVIDER_FORCE_FAIL="unavailable")
    def test_provider_failure_leaves_catalog_and_search_ok(self):
        pkg = self._create(
            title="Cox Escape",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
        )
        fail = self._post({"prompt": "cox beach"})
        self.assertEqual(fail.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertNotIn("results", fail.data)

        catalog = self.client.get("/api/packages/")
        self.assertEqual(catalog.status_code, status.HTTP_200_OK)
        catalog_ids = {row["id"] for row in catalog.data["results"]}
        self.assertIn(str(pkg.id), catalog_ids)

        search = self.client.get("/api/packages/", {"q": "cox"})
        self.assertEqual(search.status_code, status.HTTP_200_OK)
        search_ids = {row["id"] for row in search.data["results"]}
        self.assertIn(str(pkg.id), search_ids)

    def test_prompt_trimmed_before_match(self):
        match = self._create(
            title="Bandarban Hills",
            destinations="Bandarban",
            duration_days=3,
            base_price="12000.00",
        )
        response = self._post({"prompt": "  bandarban hills  "})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in response.data["results"]}
        self.assertIn(str(match.id), ids)

    def test_provider_draft_id_absent_from_results(self):
        published = self._create(
            title="Published Beach",
            destinations="Cox's Bazar",
            duration_days=3,
            base_price="10000.00",
        )
        draft = self._create(
            title="Draft Only",
            destinations="Hidden Draft",
            duration_days=4,
            base_price="9000.00",
            status_value=PackageStatus.DRAFT,
        )
        fake = MagicMock()
        fake.recommend.return_value = [
            RecommendationMatch(
                package_id=draft.id,
                why="Should never appear.",
                score=99,
            ),
            RecommendationMatch(
                package_id=published.id,
                why="Matches beach.",
                score=10,
            ),
        ]
        with patch(
            "recommendations.services.get_provider",
            return_value=fake,
        ):
            response = self._post({"prompt": "beach getaway"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertNotIn(str(draft.id), ids)
        self.assertIn(str(published.id), ids)

    def test_provider_runtime_error_becomes_502_without_secret(self):
        secret = "SUPER_SECRET_UPSTREAM_TOKEN_9f3a"
        fake = MagicMock()
        fake.recommend.side_effect = RuntimeError(secret)
        with patch(
            "recommendations.services.get_provider",
            return_value=fake,
        ):
            response = self._post({"prompt": "sundarbans mangrove"})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            response.data,
            {
                "error": {
                    "code": "provider_bad_response",
                    "message": (
                        "The recommendation provider returned an invalid response."
                    ),
                }
            },
        )
        self.assertNotIn("results", response.data)
        self.assertNotIn(secret, str(response.data))
        self.assertNotIn(secret, str(response.content))

    @override_settings(AI_PROVIDER="openai-cloud")
    def test_unknown_ai_provider_returns_502(self):
        response = self._post({"prompt": "sylhet tea hills"})
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            response.data,
            {
                "error": {
                    "code": "provider_bad_response",
                    "message": (
                        "The recommendation provider configuration is invalid."
                    ),
                }
            },
        )
        self.assertNotIn("results", response.data)
