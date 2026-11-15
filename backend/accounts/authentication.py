"""Session authentication that always enforces CSRF on unsafe methods."""

from __future__ import annotations

from rest_framework.authentication import SessionAuthentication


class CsrfSessionAuthentication(SessionAuthentication):
    """Enforce CSRF for anonymous and authenticated unsafe requests.

    Standard DRF SessionAuthentication only runs CSRF when a user is already
    authenticated. Registration and login are anonymous POSTs that still need
    same-origin CSRF (AD-2 / Story 1.4).
    """

    def authenticate(self, request):
        self.enforce_csrf(request)
        user = getattr(request._request, "user", None)
        if not user or not user.is_active:
            return None
        return (user, None)
