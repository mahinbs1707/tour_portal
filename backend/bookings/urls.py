from django.urls import path

from bookings.admin_views import (
    AdminBookingApproveView,
    AdminBookingDetailView,
    AdminBookingExtendView,
    AdminBookingListView,
    AdminBookingRejectView,
    AdminBookingReopenView,
)
from bookings.views import (
    BookingCancelView,
    BookingDetailView,
    BookingListCreateView,
)
from payments.views import BookingPaymentAttemptView

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
    path(
        "admin/<uuid:booking_id>/reject/",
        AdminBookingRejectView.as_view(),
        name="admin-booking-reject",
    ),
    path(
        "admin/<uuid:booking_id>/reopen/",
        AdminBookingReopenView.as_view(),
        name="admin-booking-reopen",
    ),
    path(
        "admin/<uuid:booking_id>/extend/",
        AdminBookingExtendView.as_view(),
        name="admin-booking-extend",
    ),
    path("<uuid:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
    path(
        "<uuid:booking_id>/cancel/",
        BookingCancelView.as_view(),
        name="booking-cancel",
    ),
    path(
        "<uuid:booking_id>/payments/attempt/",
        BookingPaymentAttemptView.as_view(),
        name="booking-payment-attempt",
    ),
]
