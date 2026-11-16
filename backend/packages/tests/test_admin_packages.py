"""Admin package create/edit/draft/publish matrix (Story 2.1)."""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from packages.models import PackageStatus, TourPackage

User = get_user_model()

SEAT_TOKENS = ("seat", "capacity", "remaining", "slots")

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


class AdminPackageAPITests(APITestCase):
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

    def _create_package_as_admin(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        return create.data["id"]

    def test_model_and_serializer_have_no_seat_fields(self):
        field_names = {f.name.lower() for f in TourPackage._meta.get_fields()}
        for token in SEAT_TOKENS:
            self.assertFalse(
                any(token in name for name in field_names),
                f"Unexpected seat-shaped field matching {token!r}: {field_names}",
            )
        from packages.serializers import TourPackageSerializer

        for name in TourPackageSerializer().fields:
            self.assertFalse(any(token in name.lower() for token in SEAT_TOKENS))

    def test_customer_denied_package_apis(self):
        package_id = self._create_package_as_admin()
        self.client.logout()
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self._login_customer()

        list_response = self.client.get("/api/packages/admin/")
        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        create_response = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        patch = self.client.patch(
            f"/api/packages/admin/{package_id}/",
            {"title": "Nope"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(patch.status_code, status.HTTP_403_FORBIDDEN)
        publish = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(publish.status_code, status.HTTP_403_FORBIDDEN)
        unpublish = self.client.post(
            f"/api/packages/admin/{package_id}/unpublish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unpublish.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            TourPackage.objects.get(pk=package_id).status, PackageStatus.DRAFT
        )

    def test_staff_without_admin_role_denied(self):
        """IsAdminRole keys on role, not is_staff (illegal combo not persisted)."""
        package_id = self._create_package_as_admin()
        self.client.logout()
        self.client.get("/api/auth/csrf/")
        staffish = User(
            email="staffish@example.com",
            full_name="Staffish",
            role=Role.CUSTOMER,
            is_staff=True,
            is_active=True,
        )
        staffish.set_unusable_password()
        self.client.force_authenticate(user=staffish)
        response = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guest_denied_package_apis(self):
        response = self.client.get("/api/packages/admin/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        publish = self.client.post(
            "/api/packages/admin/00000000-0000-0000-0000-000000000001/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertIn(
            publish.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_admin_list_returns_created_package(self):
        package_id = self._create_package_as_admin()
        listing = self.client.get("/api/packages/admin/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertIn("count", listing.data)
        self.assertIn("results", listing.data)
        ids = [row["id"] for row in listing.data["results"]]
        self.assertIn(package_id, ids)

    def test_admin_save_draft_then_publish_writes_audit(self):
        package_id = self._create_package_as_admin()
        self.assertEqual(
            AuditLog.objects.filter(action="package.create", target_id=package_id).count(),
            1,
        )

        publish = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertEqual(publish.data["status"], PackageStatus.PUBLISHED)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.publish_state_change", target_id=package_id
            ).count(),
            1,
        )
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.status, PackageStatus.PUBLISHED)
        self.assertEqual(package.base_price, Decimal("12500.00"))

    def test_publish_already_published_rejected(self):
        package_id = self._create_package_as_admin()
        self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        again = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.publish_state_change", target_id=package_id
            ).count(),
            1,
        )

    def test_unpublish_retains_package_row(self):
        package_id = self._create_package_as_admin()
        self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        unpublish = self.client.post(
            f"/api/packages/admin/{package_id}/unpublish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(unpublish.status_code, status.HTTP_200_OK)
        self.assertEqual(unpublish.data["status"], PackageStatus.DRAFT)
        self.assertTrue(TourPackage.objects.filter(pk=package_id).exists())
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.publish_state_change", target_id=package_id
            ).count(),
            2,
        )

    def test_delete_not_allowed(self):
        package_id = self._create_package_as_admin()
        response = self.client.delete(
            f"/api/packages/admin/{package_id}/",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(TourPackage.objects.filter(pk=package_id).exists())

    def test_admin_update_writes_audit(self):
        package_id = self._create_package_as_admin()
        patch = self.client.patch(
            f"/api/packages/admin/{package_id}/",
            {"title": "Updated Escape"},
            format="json",
            **self._headers(),
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["title"], "Updated Escape")
        self.assertEqual(
            AuditLog.objects.filter(action="package.update", target_id=package_id).count(),
            1,
        )

    def test_whitespace_title_rejected(self):
        self._login_admin()
        bad = {**VALID_PAYLOAD, "title": "   "}
        response = self.client.post(
            "/api/packages/admin/",
            bad,
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(TourPackage.objects.count(), 0)

    def test_media_fields_read_only_on_create(self):
        self._login_admin()
        payload = {
            **VALID_PAYLOAD,
            "cover_image": "/media/evil.jpg",
            "additional_images": ["/media/a.jpg"],
        }
        response = self.client.post(
            "/api/packages/admin/",
            payload,
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cover_image"], "")
        self.assertEqual(response.data["additional_images"], [])

    def test_invalid_draft_returns_400(self):
        self._login_admin()
        bad = {**VALID_PAYLOAD, "title": "", "base_price": "0"}
        response = self.client.post(
            "/api/packages/admin/",
            bad,
            format="json",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(TourPackage.objects.count(), 0)
        self.assertEqual(AuditLog.objects.count(), 0)

    def test_audit_failure_rolls_back_create(self):
        from packages.serializers import TourPackageSerializer
        from packages.services import PackageService

        serializer = TourPackageSerializer(data=VALID_PAYLOAD)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with patch(
            "packages.services.AuditService.record",
            side_effect=RuntimeError("audit down"),
        ):
            with self.assertRaises(RuntimeError):
                PackageService().create_draft(
                    actor_id=self.admin.id,
                    data=serializer.validated_data,
                )
        self.assertEqual(TourPackage.objects.count(), 0)
        self.assertEqual(AuditLog.objects.count(), 0)
