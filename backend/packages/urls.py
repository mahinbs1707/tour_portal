"""Package API URL routes."""

from django.urls import path

from packages.views import (
    AdminPackageDetailView,
    AdminPackageListCreateView,
    AdminPackagePublishView,
    AdminPackageUnpublishView,
)

urlpatterns = [
    path(
        "admin/",
        AdminPackageListCreateView.as_view(),
        name="admin-package-list-create",
    ),
    path(
        "admin/<uuid:pk>/",
        AdminPackageDetailView.as_view(),
        name="admin-package-detail",
    ),
    path(
        "admin/<uuid:pk>/publish/",
        AdminPackagePublishView.as_view(),
        name="admin-package-publish",
    ),
    path(
        "admin/<uuid:pk>/unpublish/",
        AdminPackageUnpublishView.as_view(),
        name="admin-package-unpublish",
    ),
]
