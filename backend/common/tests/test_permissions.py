"""IsCustomer / IsAdminRole permission matrix (Story 1.3 AC)."""

from __future__ import annotations

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from accounts.models import Role, User
from common.permissions import IsAdminRole, IsCustomer


class _StubAdminOnlyView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response({"ok": True})


class RolePermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.is_admin = IsAdminRole()
        self.is_customer = IsCustomer()
        self.view = object()

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="SecurePass1",
            role=Role.CUSTOMER,
            is_staff=False,
            full_name="Customer",
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="SecurePass1",
            role=Role.ADMIN,
            is_staff=True,
            full_name="Admin",
        )

    def _request(self, user):
        request = self.factory.get("/api/stub/")
        request.user = user
        return request

    def test_customer_allowed_on_is_customer(self):
        self.assertTrue(
            self.is_customer.has_permission(self._request(self.customer), self.view)
        )

    def test_admin_denied_on_is_customer(self):
        self.assertFalse(
            self.is_customer.has_permission(self._request(self.admin), self.view)
        )

    def test_customer_denied_on_is_admin_role(self):
        self.assertFalse(
            self.is_admin.has_permission(self._request(self.customer), self.view)
        )

    def test_admin_allowed_on_is_admin_role(self):
        self.assertTrue(
            self.is_admin.has_permission(self._request(self.admin), self.view)
        )

    def test_inactive_admin_denied_on_is_admin_role(self):
        self.admin.is_active = False
        self.admin.save()
        self.assertFalse(
            self.is_admin.has_permission(self._request(self.admin), self.view)
        )

    def test_inactive_customer_denied_on_is_customer(self):
        self.customer.is_active = False
        self.customer.save()
        self.assertFalse(
            self.is_customer.has_permission(self._request(self.customer), self.view)
        )

    def test_is_staff_alone_insufficient_for_admin_api(self):
        """Staff without role=ADMIN must be denied (never treat is_staff as Admin)."""
        # Unsaved in-memory user: mirrors corrupt/legacy staff without ADMIN role.
        # Skip User.save() validation so we can prove IsAdminRole ignores is_staff.
        staff_only = User(
            email="staff-only@example.com",
            role=Role.CUSTOMER,
            is_staff=True,
            is_active=True,
        )
        staff_only.set_password("SecurePass1")

        self.assertTrue(staff_only.is_authenticated)
        self.assertTrue(staff_only.is_staff)
        self.assertNotEqual(staff_only.role, Role.ADMIN)
        self.assertFalse(
            self.is_admin.has_permission(self._request(staff_only), self.view)
        )

    def test_anonymous_denied(self):
        anon = AnonymousUser()
        self.assertFalse(self.is_admin.has_permission(self._request(anon), self.view))
        self.assertFalse(
            self.is_customer.has_permission(self._request(anon), self.view)
        )

    def test_is_admin_role_denial_returns_http_403(self):
        request = self.factory.get("/api/stub-admin/")
        force_authenticate(request, user=self.customer)
        response = _StubAdminOnlyView.as_view()(request)
        self.assertEqual(response.status_code, 403)
