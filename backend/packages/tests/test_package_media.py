"""Package media upload/serving matrix (Story 2.3)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Role
from audit.models import AuditLog
from packages.models import PackageStatus, TourPackage

User = get_user_model()

# Minimal magic-valid payloads for allowlisted types.
JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xd9"
)
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)
WEBP_BYTES = (
    b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00"
    b"\x10\x01\x00\x9d\x01*\x01\x00\x01\x00\x00\x00\xfe\x01\xa8\x00"
)
GIF_BYTES = b"GIF89a\x01\x00\x01\x00\x00\x00\x00;"

VALID_PAYLOAD = {
    "title": "Media Tour",
    "short_description": "Short",
    "full_description": "Full",
    "destinations": "Dhaka",
    "duration_days": 2,
    "duration_nights": 1,
    "starting_location": "Airport",
    "base_price": "1000.00",
    "currency": "BDT",
    "included_services": "Guide",
    "excluded_services": "Flights",
    "itinerary": "Day 1",
}


class PackageMediaAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, status.HTTP_200_OK)
        self.csrf_token = self.client.cookies.get("csrftoken").value

        self.customer = User.objects.create_user(
            email="customer@media.example",
            password="SecurePass1",
            full_name="Casey Customer",
            role=Role.CUSTOMER,
            is_staff=False,
        )
        self.admin = User.objects.create_user(
            email="admin@media.example",
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
        self._login("admin@media.example")

    def _login_customer(self):
        self._login("customer@media.example")

    def _create_package(self):
        self._login_admin()
        create = self.client.post(
            "/api/packages/admin/",
            VALID_PAYLOAD,
            format="json",
            **self._headers(),
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        return create.data["id"]

    def _jpeg(self, name="cover.jpg", content=None):
        return SimpleUploadedFile(
            name,
            content if content is not None else JPEG_BYTES,
            content_type="image/jpeg",
        )

    def _abs_media(self, url: str) -> Path:
        return Path(settings.MEDIA_ROOT) / url[len("/media/") :]

    def test_admin_cover_upload_stores_media_url_and_audits(self):
        package_id = self._create_package()
        before_updates = AuditLog.objects.filter(
            action="package.update", target_id=package_id
        ).count()

        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": self._jpeg()},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cover = response.data["cover_image"]
        self.assertTrue(cover.startswith("/media/packages/"))
        self.assertIn(f"/media/packages/{package_id}/cover-", cover)
        self.assertTrue(cover.endswith(".jpg"))

        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.cover_image, cover)
        relative = cover[len("/media/") :]
        absolute = Path(settings.MEDIA_ROOT) / relative
        self.assertTrue(absolute.is_file())
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            before_updates + 1,
        )

    def test_additional_append_and_cap(self):
        package_id = self._create_package()
        for i in range(8):
            response = self.client.post(
                f"/api/packages/admin/{package_id}/media/additional/",
                {"file": self._jpeg(name=f"a{i}.jpg")},
                format="multipart",
                **self._headers(),
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data["additional_images"]), i + 1)

        capped = self.client.post(
            f"/api/packages/admin/{package_id}/media/additional/",
            {"file": self._jpeg(name="overflow.jpg")},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(capped.status_code, status.HTTP_400_BAD_REQUEST)
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(len(package.additional_images), 8)

    def test_disallowed_type_rejected_no_persist(self):
        package_id = self._create_package()
        bad = SimpleUploadedFile(
            "anim.gif",
            GIF_BYTES,
            content_type="image/gif",
        )
        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": bad},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.cover_image, "")
        media_dir = Path(settings.MEDIA_ROOT) / "packages" / str(package_id)
        if media_dir.exists():
            self.assertEqual(list(media_dir.iterdir()), [])

    def test_mime_mismatch_rejected(self):
        package_id = self._create_package()
        mismatched = SimpleUploadedFile(
            "fake.jpg",
            GIF_BYTES,
            content_type="image/jpeg",
        )
        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": mismatched},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            TourPackage.objects.get(pk=package_id).cover_image,
            "",
        )

    @override_settings(MEDIA_UPLOAD_MAX_BYTES=64)
    def test_oversized_rejected_no_persist(self):
        package_id = self._create_package()
        oversized = SimpleUploadedFile(
            "big.jpg",
            JPEG_BYTES + (b"\x00" * 128),
            content_type="image/jpeg",
        )
        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": oversized},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(
            TourPackage.objects.get(pk=package_id).cover_image,
            "",
        )

    def test_customer_upload_forbidden(self):
        package_id = self._create_package()
        self.client.logout()
        self.client.get("/api/auth/csrf/")
        self._login_customer()
        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": self._jpeg()},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            TourPackage.objects.get(pk=package_id).cover_image,
            "",
        )

    def test_guest_upload_forbidden(self):
        package_id = self._create_package()
        self.client.logout()
        self.client.get("/api/auth/csrf/")
        response = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": self._jpeg()},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            TourPackage.objects.get(pk=package_id).cover_image,
            "",
        )

    def test_clear_cover_and_remove_additional(self):
        package_id = self._create_package()
        cover = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": self._jpeg()},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(cover.status_code, status.HTTP_200_OK)
        cover_url = cover.data["cover_image"]
        cover_path = self._abs_media(cover_url)
        self.assertTrue(cover_path.is_file())

        replaced = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {"file": self._jpeg(name="cover2.jpg")},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(replaced.status_code, status.HTTP_200_OK)
        self.assertFalse(cover_path.exists())
        new_cover_path = self._abs_media(replaced.data["cover_image"])
        self.assertTrue(new_cover_path.is_file())

        add = self.client.post(
            f"/api/packages/admin/{package_id}/media/additional/",
            {"file": self._jpeg(name="extra.jpg")},
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(add.status_code, status.HTTP_200_OK)
        self.assertEqual(len(add.data["additional_images"]), 1)
        additional_url = add.data["additional_images"][0]
        additional_path = self._abs_media(additional_url)
        self.assertTrue(additional_path.is_file())
        updates_after_append = AuditLog.objects.filter(
            action="package.update", target_id=package_id
        ).count()
        self.assertGreaterEqual(updates_after_append, 3)  # cover + replace + append

        cleared = self.client.delete(
            f"/api/packages/admin/{package_id}/media/cover/",
            **self._headers(),
        )
        self.assertEqual(cleared.status_code, status.HTTP_200_OK)
        self.assertEqual(cleared.data["cover_image"], "")
        self.assertFalse(new_cover_path.exists())
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            updates_after_append + 1,
        )

        removed = self.client.delete(
            f"/api/packages/admin/{package_id}/media/additional/0/",
            **self._headers(),
        )
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.assertEqual(removed.data["additional_images"], [])
        self.assertFalse(additional_path.exists())
        self.assertEqual(
            AuditLog.objects.filter(
                action="package.update", target_id=package_id
            ).count(),
            updates_after_append + 2,
        )

        bad_index = self.client.delete(
            f"/api/packages/admin/{package_id}/media/additional/0/",
            **self._headers(),
        )
        self.assertEqual(bad_index.status_code, status.HTTP_400_BAD_REQUEST)

    def test_json_patch_cannot_mutate_media(self):
        package_id = self._create_package()
        patch = self.client.patch(
            f"/api/packages/admin/{package_id}/",
            {
                "cover_image": "/media/evil.jpg",
                "additional_images": ["/media/a.jpg"],
                "title": "Still Media Tour",
            },
            format="json",
            **self._headers(),
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["cover_image"], "")
        self.assertEqual(patch.data["additional_images"], [])
        self.assertEqual(patch.data["title"], "Still Media Tour")

    def test_published_get_returns_media_urls(self):
        package_id = self._create_package()
        upload = self.client.post(
            f"/api/packages/admin/{package_id}/media/cover/",
            {
                "file": SimpleUploadedFile(
                    "cover.png",
                    PNG_BYTES,
                    content_type="image/png",
                )
            },
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(upload.status_code, status.HTTP_200_OK)
        extra = self.client.post(
            f"/api/packages/admin/{package_id}/media/additional/",
            {
                "file": SimpleUploadedFile(
                    "extra.webp",
                    WEBP_BYTES,
                    content_type="image/webp",
                )
            },
            format="multipart",
            **self._headers(),
        )
        self.assertEqual(extra.status_code, status.HTTP_200_OK)

        publish = self.client.post(
            f"/api/packages/admin/{package_id}/publish/",
            {},
            format="json",
            **self._headers(),
        )
        self.assertEqual(publish.status_code, status.HTTP_200_OK)
        self.assertEqual(publish.data["status"], PackageStatus.PUBLISHED)

        detail = self.client.get(f"/api/packages/admin/{package_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["cover_image"].startswith("/media/"))
        self.assertTrue(
            all(url.startswith("/media/") for url in detail.data["additional_images"])
        )

    def test_audit_failure_rolls_back_cover_and_deletes_new_file(self):
        package_id = self._create_package()
        with patch(
            "packages.services.AuditService.record",
            side_effect=RuntimeError("audit down"),
        ):
            with self.assertRaises(RuntimeError):
                from packages.services import PackageService

                package = TourPackage.objects.get(pk=package_id)
                PackageService().set_cover_image(
                    actor_id=self.admin.id,
                    package=package,
                    uploaded=self._jpeg(),
                )
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.cover_image, "")
        media_dir = Path(settings.MEDIA_ROOT) / "packages" / str(package_id)
        if media_dir.exists():
            self.assertEqual(list(media_dir.iterdir()), [])

    def test_audit_failure_rolls_back_additional_and_deletes_new_file(self):
        package_id = self._create_package()
        with patch(
            "packages.services.AuditService.record",
            side_effect=RuntimeError("audit down"),
        ):
            with self.assertRaises(RuntimeError):
                from packages.services import PackageService

                package = TourPackage.objects.get(pk=package_id)
                PackageService().append_additional_image(
                    actor_id=self.admin.id,
                    package=package,
                    uploaded=self._jpeg(name="extra.jpg"),
                )
        package = TourPackage.objects.get(pk=package_id)
        self.assertEqual(package.additional_images, [])
        media_dir = Path(settings.MEDIA_ROOT) / "packages" / str(package_id)
        if media_dir.exists():
            self.assertEqual(list(media_dir.iterdir()), [])
