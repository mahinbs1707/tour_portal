"""Featured flag + Admin list filters (Story 2.4)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from packages.models import PackageStatus, TourPackage
from packages.tests.test_admin_packages import VALID_PAYLOAD

User = get_user_model()


class FeaturedAndListFilterTests(APITestCase):
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

    def _headers(self, client=None):
        client = client or self.client
        cookie = client.cookies.get("csrftoken")
        token = cookie.value if cookie else self.csrf_token
        return {"HTTP_X_CSRFTOKEN": token}

    def _login(self, email):
        response = self.client.post(
            "/api/auth/login/",
            {"email": email, "password": "SecurePass1"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _login_admin(self):
        self._login("admin@example.com")

    def _login_customer(self):
        self._login("customer@example.com")

    def _create_and_publish(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        package_id = create.data["id"]
        publish = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        return package_id

    def test_feature_published_persists_and_audits(self):
        package_id = self._create_and_publish()
        before_updates = AuditLog.objects.filter(
            action="package.update", target_id=package_id
        ).count()

        feature = self.client.post(
            f"/api/packages/admin/{package_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(feature.status_code, status.HTTP_200_OK)
        self.assertTrue(feature.data["is_featured"])
        package = TourPackage.objects.get(pk=package_id)
        self.assertTrue(package.is_featured)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            before_updates + 1,
        )

    def test_unfeature_published_clears_flag_and_audits(self):
        package_id = self._create_and_publish()
        self.client.post(
            f"/api/packages/admin/{package_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )
        before_updates = AuditLog.objects.filter(
            action="package.update", target_id=package_id
        ).count()
        unfeature = self.client.post(
            f"/api/packages/admin/{package_id}/unfeature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unfeature.status_code, status.HTTP_200_OK)
        self.assertFalse(unfeature.data["is_featured"])
        self.assertFalse(TourPackage.objects.get(pk=package_id).is_featured)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            before_updates + 1,
        )

    def test_feature_draft_rejected(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        package_id = create.data["id"]
        feature = self.client.post(
            f"/api/packages/admin/{package_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(feature.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", feature.data)
        self.assertFalse(TourPackage.objects.get(pk=package_id).is_featured)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            0,
        )

    def test_unfeature_draft_rejected(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        package_id = create.data["id"]
        unfeature = self.client.post(
            f"/api/packages/admin/{package_id}/unfeature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unfeature.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", unfeature.data)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            0,
        )

    def test_customer_denied_feature_unfeature(self):
        package_id = self._create_and_publish()
        self.client.logout()
        self.client.get("/api/auth/csrf/")
        self._login_customer()

        feature = self.client.post(
            f"/api/packages/admin/{package_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(feature.status_code, status.HTTP_403_FORBIDDEN)
        unfeature = self.client.post(
            f"/api/packages/admin/{package_id}/unfeature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unfeature.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TourPackage.objects.get(pk=package_id).is_featured)

    def test_unpublish_clears_featured(self):
        package_id = self._create_and_publish()
        feature = self.client.post(
            f"/api/packages/admin/{package_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertTrue(feature.data["is_featured"])

        unpublish = self.client.post(
            f"/api/packages/admin/{package_id}/unpublish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unpublish.status_code, status.HTTP_200_OK)
        self.assertEqual(unpublish.data["status"], PackageStatus.DRAFT)
        self.assertFalse(unpublish.data["is_featured"])
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.status, PackageStatus.DRAFT)
        self.assertFalse(package.is_featured)

    def test_is_featured_read_only_on_json_create_and_patch(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            {**VALID_PAYLOAD, "is_featured": True},
            format="json",
            **self._headers(),
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertFalse(create.data["is_featured"])
        package_id = create.data["id"]

        self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        patch = self.client.patch(
            f"/api/packages/admin/{package_id}/",
            {"is_featured": True, "title": "Still published"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertFalse(patch.data["is_featured"])
        self.assertFalse(TourPackage.objects.get(pk=package_id).is_featured)

    def test_list_filters_status_and_featured(self):
        published_id = self._create_and_publish()
        create_draft = self.client.post(
            "/api/packages/admin/",
            {**VALID_PAYLOAD, "title": "Draft Only"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(create_draft.status_code, status.HTTP_201_CREATED)
        draft_id = create_draft.data["id"]

        self.client.post(
            f"/api/packages/admin/{published_id}/feature/",
            {},
            format="json",
            **self._headers(),
        )

        published_filter = self.client.get(
            "/api/packages/admin/?status=PUBLISHED"
        )
        self.assertEqual(published_filter.status_code, status.HTTP_200_OK)
        published_ids = [row["id"] for row in published_filter.data["results"]]
        self.assertIn(published_id, published_ids)
        self.assertNotIn(draft_id, published_ids)

        draft_filter = self.client.get("/api/packages/admin/?status=DRAFT")
        self.assertEqual(draft_filter.status_code, status.HTTP_200_OK)
        draft_ids = [row["id"] for row in draft_filter.data["results"]]
        self.assertIn(draft_id, draft_ids)
        self.assertNotIn(published_id, draft_ids)

        featured_filter = self.client.get(
            "/api/packages/admin/?featured=true"
        )
        self.assertEqual(featured_filter.status_code, status.HTTP_200_OK)
        featured_ids = [row["id"] for row in featured_filter.data["results"]]
        self.assertEqual(featured_ids, [published_id])

        not_featured = self.client.get("/api/packages/admin/?featured=false")
        self.assertEqual(not_featured.status_code, status.HTTP_200_OK)
        not_featured_ids = [row["id"] for row in not_featured.data["results"]]
        self.assertIn(draft_id, not_featured_ids)
        self.assertNotIn(published_id, not_featured_ids)

        combined = self.client.get(
            "/api/packages/admin/?status=PUBLISHED&featured=true"
        )
        self.assertEqual(combined.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [row["id"] for row in combined.data["results"]], [published_id]
        )

    def test_invalid_list_filters_return_400(self):
        self._login_admin()
        bad_status = self.client.get("/api/packages/admin/?status=ARCHIVED")
        self.assertEqual(bad_status.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", bad_status.data)

        bad_featured = self.client.get("/api/packages/admin/?featured=maybe")
        self.assertEqual(bad_featured.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("featured", bad_featured.data)
