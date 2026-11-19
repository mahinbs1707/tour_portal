"""Admin booking API — Admin role only.

Story 6.1: list + detail (read-only). Story 6.2: approve. Story 6.3: reject
(with a mandatory reason). Story 6.4: reopen + extend via ``BookingService`` →
``PaymentService``. This module never writes ``PaymentWindow`` rows directly.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from bookings.models import Booking, BookingStatus
from bookings.serializers import (
    AdminBookingExtendSerializer,
    AdminBookingRejectSerializer,
    AdminBookingSerializer,
)
from bookings.services import (
    BookingNotApprovable,
    BookingNotRejectable,
    BookingPaymentWindowNotExtendable,
    BookingPaymentWindowNotReopenable,
    BookingService,
)
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


class AdminBookingApproveView(APIView):
    """POST /api/bookings/admin/<uuid>/approve/ — approve a PENDING booking.

    404 unknown id; 409 not PENDING; 400 when the 7-day rule fails at approve
    time or the booking has no payment window. Returns the Admin detail shape.
    """

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        try:
            booking = BookingService().approve(admin=request.user, booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except BookingNotApprovable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        booking = get_object_or_404(_all_bookings(), pk=booking.pk)
        return Response(AdminBookingSerializer(booking).data)


class AdminBookingRejectView(APIView):
    """POST /api/bookings/admin/<uuid>/reject/ — reject a PENDING booking.

    Body ``{"rejection_reason": "..."}`` (required, trimmed, max 2000). 400
    blank/too-long/missing reason; 404 unknown id; 409 not PENDING. The payment
    window is never touched. Returns the Admin detail shape.
    """

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        serializer = AdminBookingRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = BookingService().reject(
                admin=request.user,
                booking_id=booking_id,
                reason=serializer.validated_data["rejection_reason"],
            )
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except BookingNotRejectable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        booking = get_object_or_404(_all_bookings(), pk=booking.pk)
        return Response(AdminBookingSerializer(booking).data)


class AdminBookingReopenView(APIView):
    """POST /api/bookings/admin/<uuid>/reopen/ — reopen an EXPIRED payment window."""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        try:
            booking = BookingService().reopen_payment_window(
                admin=request.user, booking_id=booking_id
            )
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except BookingPaymentWindowNotReopenable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        booking = get_object_or_404(_all_bookings(), pk=booking.pk)
        return Response(AdminBookingSerializer(booking).data)


class AdminBookingExtendView(APIView):
    """POST /api/bookings/admin/<uuid>/extend/ — set a future payment deadline."""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        serializer = AdminBookingExtendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = BookingService().extend_payment_window(
                admin=request.user,
                booking_id=booking_id,
                deadline_at=serializer.validated_data["deadline_at"],
            )
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except BookingPaymentWindowNotExtendable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        booking = get_object_or_404(_all_bookings(), pk=booking.pk)
        return Response(AdminBookingSerializer(booking).data)
