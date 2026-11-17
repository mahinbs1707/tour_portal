"""Booking create API — Customer only (Story 5.1)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from bookings.models import Booking
from bookings.serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingResponseSerializer,
)
from bookings.services import BookingNotCancellable, BookingService
from common.permissions import IsCustomer


def _validation_response(exc: DjangoValidationError) -> Response:
    if hasattr(exc, "message_dict"):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {"detail": list(getattr(exc, "messages", [str(exc)]))},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _owned_bookings(user):
    return (
        Booking.objects.filter(customer=user)
        .select_related("package", "available_date", "payment_window")
        .prefetch_related("payments")
    )


class BookingListCreateView(APIView):
    """GET /api/bookings/ — own history; POST — create PENDING booking."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        bookings = _owned_bookings(request.user).order_by("-created_at", "-id")
        return Response(BookingDetailSerializer(bookings, many=True).data)

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            booking = BookingService().create(
                customer=request.user,
                package_id=data["package_id"],
                available_date_id=data["available_date_id"],
                travelers=data["travelers"],
                contact_name=data["contact_name"],
                contact_email=data["contact_email"],
                contact_phone=data["contact_phone"],
                additional_requirements=data.get("additional_requirements", ""),
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(
            BookingResponseSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(APIView):
    """GET /api/bookings/<uuid>/ — own booking detail (404 for foreign ids)."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request, booking_id):
        booking = get_object_or_404(_owned_bookings(request.user), pk=booking_id)
        return Response(BookingDetailSerializer(booking).data)


class BookingCancelView(APIView):
    """POST /api/bookings/<uuid>/cancel/ — cancel own PENDING booking."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        try:
            booking = BookingService().cancel(
                customer=request.user, booking_id=booking_id
            )
        except Booking.DoesNotExist:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except BookingNotCancellable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        booking = get_object_or_404(_owned_bookings(request.user), pk=booking.pk)
        return Response(BookingDetailSerializer(booking).data)
