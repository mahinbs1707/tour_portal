from django.urls import path

from bookings.admin_views import (
    AdminBookingApproveView,
    AdminBookingDetailView,
    AdminBookingListView,
)
from bookings.views import (
    BookingCancelView,
    BookingDetailView,
    BookingListCreateView,
)

urlpatterns = [
    path("", BookingListCreateView.as_view(), name="booking-list-create"),
    path("admin/", AdminBookingListView.as_view(), name="admin-booking-list"),
    path(
        "admin/<uuid:booking_id>/",
        AdminBookingDetailView.as_view(),
        name="admin-booking-detail",
    ),
    path(
        "admin/<uuid:booking_id>/approve/",
        AdminBookingApproveView.as_view(),
        name="admin-booking-approve",
    ),
    path("<uuid:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
    path(
        "<uuid:booking_id>/cancel/",
        BookingCancelView.as_view(),
        name="booking-cancel",
    ),
]
