"""Booking create API — Customer only (Story 5.1)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from bookings.serializers import BookingCreateSerializer, BookingResponseSerializer
from bookings.services import BookingService
from common.permissions import IsCustomer


def _validation_response(exc: DjangoValidationError) -> Response:
    if hasattr(exc, "message_dict"):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {"detail": list(getattr(exc, "messages", [str(exc)]))},
        status=status.HTTP_400_BAD_REQUEST,
    )


class BookingCreateView(APIView):
    """POST /api/bookings/ — create PENDING booking + NOT_OPEN window."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

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
