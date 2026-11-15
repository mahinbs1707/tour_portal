"""Role-based DRF permission classes (AD-3 / AD-19).

Application Admin APIs must use IsAdminRole (role == ADMIN).
Django IsAdminUser / is_staff alone is never sufficient.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from accounts.models import Role


class IsCustomer(BasePermission):
    """Allow only authenticated users with role == CUSTOMER."""

    message = "Customer role required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) == Role.CUSTOMER
        )


class IsAdminRole(BasePermission):
    """Allow only authenticated users with role == ADMIN (not is_staff alone)."""

    message = "Admin role required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) == Role.ADMIN
        )
