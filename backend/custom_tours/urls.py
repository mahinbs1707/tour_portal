from django.urls import path

from custom_tours.admin_views import (
    AdminCustomTourApproveView,
    AdminCustomTourDetailView,
    AdminCustomTourListView,
    AdminCustomTourRejectView,
)
from custom_tours.views import (
    CustomTourDetailView,
    CustomTourListCreateView,
    CustomTourReapplyView,
)

urlpatterns = [
    path("admin/", AdminCustomTourListView.as_view(), name="admin-custom-tour-list"),
    path(
        "admin/<uuid:tour_id>/",
        AdminCustomTourDetailView.as_view(),
        name="admin-custom-tour-detail",
    ),
    path(
        "admin/<uuid:tour_id>/approve/",
        AdminCustomTourApproveView.as_view(),
        name="admin-custom-tour-approve",
    ),
    path(
        "admin/<uuid:tour_id>/reject/",
        AdminCustomTourRejectView.as_view(),
        name="admin-custom-tour-reject",
    ),
    path("", CustomTourListCreateView.as_view(), name="custom-tour-list-create"),
    path(
        "<uuid:tour_id>/reapply/",
        CustomTourReapplyView.as_view(),
        name="custom-tour-reapply",
    ),
    path("<uuid:tour_id>/", CustomTourDetailView.as_view(), name="custom-tour-detail"),
]