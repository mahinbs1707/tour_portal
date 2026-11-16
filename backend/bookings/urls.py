from django.urls import path

from bookings.views import BookingCreateView

urlpatterns = [
    path("", BookingCreateView.as_view(), name="booking-create"),
]
