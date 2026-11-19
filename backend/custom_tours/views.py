"""Custom tour Customer APIs (Story 8.1–8.2)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from common.permissions import IsCustomer
from custom_tours.models import CustomTour
from custom_tours.serializers import (
    CustomTourCreateSerializer,
    CustomTourDetailSerializer,
    CustomTourResponseSerializer,
)
from custom_tours.services import (
    CustomTourReapplyNotAllowed,
    CustomTourService,
)


def _validation_response(exc: DjangoValidationError) -> Response:
    if hasattr(exc, "message_dict"):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {"detail": list(getattr(exc, "messages", [str(exc)]))},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _owned_tours(user):
    return CustomTour.objects.filter(customer=user)


class CustomTourListCreateView(APIView):
    """GET /api/custom-tours/ — own history; POST — create PENDING custom tour."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        tours = (
            _owned_tours(request.user)
            .prefetch_related("reviews")
            .order_by("-created_at", "-id")
        )
        return Response(CustomTourDetailSerializer(tours, many=True).data)

    def post(self, request):
        serializer = CustomTourCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        idempotency_key = request.META.get("HTTP_IDEMPOTENCY_KEY")
        try:
            tour, created = CustomTourService().create(
                customer=request.user,
                idempotency_key=idempotency_key,
                **data,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(
            CustomTourResponseSerializer(tour).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CustomTourDetailView(APIView):
    """GET /api/custom-tours/<uuid>/ — own custom tour detail (404 for foreign ids)."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request, tour_id):
        tour = get_object_or_404(
            _owned_tours(request.user).prefetch_related("reviews"),
            pk=tour_id,
        )
        return Response(CustomTourDetailSerializer(tour).data)


class CustomTourReapplyView(APIView):
    """POST /api/custom-tours/<uuid>/reapply/ — resubmit after rejection (Story 8.4)."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, tour_id):
        get_object_or_404(_owned_tours(request.user), pk=tour_id)
        serializer = CustomTourCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        service = CustomTourService()
        try:
            tour = service.reapply(
                customer=request.user,
                tour_id=tour_id,
                **data,
            )
        except CustomTour.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except CustomTourReapplyNotAllowed as exc:
            return Response({"detail": [str(exc)]}, status=status.HTTP_403_FORBIDDEN)
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(CustomTourDetailSerializer(tour).data)