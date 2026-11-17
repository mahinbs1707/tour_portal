"""Admin booking list + detail API (Story 6.1) — read-only, Admin role only.

Decisions (approve/reject) and payment-window control land in Stories 6.2–6.4.
This module never mutates bookings or ``PaymentWindow`` rows.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.authentication import CsrfSessionAuthentication
from bookings.models import Booking, BookingStatus
from bookings.serializers import AdminBookingSerializer
from common.permissions import IsAdminRole

# Same page size as the Admin packages list (AD-11).
ADMIN_BOOKING_LIST_PAGE_SIZE = 20


class AdminBookingPagination(PageNumberPagination):
    page_size = ADMIN_BOOKING_LIST_PAGE_SIZE


def _all_bookings():
    """Ownership-free queryset (Admin sees every customer's bookings)."""
    return Booking.objects.select_related(
        "customer", "package", "available_date", "payment_window"
    ).prefetch_related("payments")


class AdminBookingListView(ListAPIView):
    """GET /api/bookings/admin/?status=&page= — all bookings, newest first."""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]
    serializer_class = AdminBookingSerializer
    pagination_class = AdminBookingPagination

    def list(self, request, *args, **kwargs):
        status_param = request.query_params.get("status")
        if status_param is not None and status_param not in BookingStatus.values:
            return Response(
                {
                    "status": [
                        "Invalid status filter. Use PENDING, APPROVED, "
                        "REJECTED or CANCELLED."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = _all_bookings().order_by("-created_at", "-id")
        status_param = self.request.query_params.get("status")
        if status_param in BookingStatus.values:
            queryset = queryset.filter(status=status_param)
        return queryset


class AdminBookingDetailView(RetrieveAPIView):
    """GET /api/bookings/admin/<uuid>/ — any booking by UUID (404 if missing)."""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]
    serializer_class = AdminBookingSerializer
    lookup_url_kwarg = "booking_id"

    def get_queryset(self):
        return _all_bookings()
