"""URL configuration for Tour Portal backend skeleton."""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET


@require_GET
def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", health, name="api-health"),
    path("api/auth/", include("accounts.urls")),
    path("api/packages/", include("packages.urls")),
    path("api/recommendations/", include("recommendations.urls")),
    path("api/bookings/", include("bookings.urls")),
]
