"""Customer payment APIs (Story 7.1 / custom-tour pay)."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from bookings.views import _owned_bookings
from common.permissions import IsCustomer
from custom_tours.models import CustomTour
from payments.eligibility import PaymentNotEligible
from payments.serializers import PaymentAttemptResponseSerializer, PaymentAttemptSerializer
from payments.services import (
    InvalidPaymentOutcome,
    PaymentAlreadySucceeded,
    PaymentService,
)


class BookingPaymentAttemptView(APIView):
    """POST /api/bookings/<uuid>/payments/attempt/ — mock payment attempt."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, booking_id):
        booking = get_object_or_404(_owned_bookings(request.user), pk=booking_id)
        serializer = PaymentAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = PaymentService().record_mock_attempt(
                booking,
                customer=request.user,
                outcome=serializer.validated_data["outcome"],
            )
        except PaymentAlreadySucceeded as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except PaymentNotEligible as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except InvalidPaymentOutcome as exc:
            return Response({"outcome": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            PaymentAttemptResponseSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class CustomTourPaymentAttemptView(APIView):
    """POST /api/custom-tours/<uuid>/payments/attempt/ — mock custom-tour payment."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, tour_id):
        tour = get_object_or_404(
            CustomTour.objects.filter(customer=request.user), pk=tour_id
        )
        serializer = PaymentAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = PaymentService().record_mock_attempt_for_custom_tour(
                tour,
                customer=request.user,
                outcome=serializer.validated_data["outcome"],
            )
        except PaymentAlreadySucceeded as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except PaymentNotEligible as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except InvalidPaymentOutcome as exc:
            return Response({"outcome": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            PaymentAttemptResponseSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )