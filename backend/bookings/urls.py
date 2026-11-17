from django.urls import path

from bookings.views import (
    BookingCancelView,
    BookingDetailView,
    BookingListCreateView,
)

urlpatterns = [
    path("", BookingListCreateView.as_view(), name="booking-list-create"),
    path("<uuid:booking_id>/", BookingDetailView.as_view(), name="booking-detail"),
    path(
        "<uuid:booking_id>/cancel/",
        BookingCancelView.as_view(),
        name="booking-cancel",
    ),
]
