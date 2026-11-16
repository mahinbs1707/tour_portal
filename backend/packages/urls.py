"""Package API URL routes."""

from django.urls import path

from packages.views import (
    AdminAvailableDateDeactivateView,
    AdminAvailableDateDetailView,
    AdminAvailableDateListCreateView,
    AdminPackageAdditionalMediaIndexView,
    AdminPackageAdditionalMediaView,
    AdminPackageCoverMediaView,
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
    path(
        "admin/<uuid:pk>/media/cover/",
        AdminPackageCoverMediaView.as_view(),
        name="admin-package-media-cover",
    ),
    path(
        "admin/<uuid:pk>/media/additional/",
        AdminPackageAdditionalMediaView.as_view(),
        name="admin-package-media-additional",
    ),
    path(
        "admin/<uuid:pk>/media/additional/<int:index>/",
        AdminPackageAdditionalMediaIndexView.as_view(),
        name="admin-package-media-additional-index",
    ),
    path(
        "admin/<uuid:package_id>/dates/",
        AdminAvailableDateListCreateView.as_view(),
        name="admin-available-date-list-create",
    ),
    path(
        "admin/<uuid:package_id>/dates/<uuid:date_id>/",
        AdminAvailableDateDetailView.as_view(),
        name="admin-available-date-detail",
    ),
    path(
        "admin/<uuid:package_id>/dates/<uuid:date_id>/deactivate/",
        AdminAvailableDateDeactivateView.as_view(),
        name="admin-available-date-deactivate",
    ),
]
