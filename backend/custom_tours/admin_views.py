"""Admin custom tour API — Admin role only (Story 8.3)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from common.permissions import IsAdminRole
from custom_tours.models import CustomTour, CustomTourStatus
from custom_tours.serializers import (
    AdminCustomTourRejectSerializer,
    AdminCustomTourSerializer,
)
from custom_tours.services import (
    CustomTourNotApprovable,
    CustomTourNotRejectable,
    CustomTourService,
)
from custom_tours.views import _validation_response

ADMIN_CUSTOM_TOUR_LIST_PAGE_SIZE = 20


class AdminCustomTourPagination(PageNumberPagination):
    page_size = ADMIN_CUSTOM_TOUR_LIST_PAGE_SIZE


def _all_custom_tours():
    return CustomTour.objects.select_related("customer")


class AdminCustomTourListView(ListAPIView):
    """GET /api/custom-tours/admin/?status=&page="""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]
    serializer_class = AdminCustomTourSerializer
    pagination_class = AdminCustomTourPagination

    def list(self, request, *args, **kwargs):
        status_param = request.query_params.get("status")
        if status_param is not None and status_param not in CustomTourStatus.values:
            return Response(
                {
                    "status": [
                        "Invalid status filter. Use PENDING, APPROVED or REJECTED."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = _all_custom_tours().order_by("-created_at", "-id")
        status_param = self.request.query_params.get("status")
        if status_param in CustomTourStatus.values:
            queryset = queryset.filter(status=status_param)
        return queryset


class AdminCustomTourDetailView(RetrieveAPIView):
    """GET /api/custom-tours/admin/<uuid>/"""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]
    serializer_class = AdminCustomTourSerializer
    lookup_url_kwarg = "tour_id"

    def get_queryset(self):
        return _all_custom_tours()


class AdminCustomTourApproveView(APIView):
    """POST /api/custom-tours/admin/<uuid>/approve/"""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, tour_id):
        try:
            tour = CustomTourService().approve(admin=request.user, tour_id=tour_id)
        except CustomTour.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except CustomTourNotApprovable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return _validation_response(exc)
        tour = get_object_or_404(_all_custom_tours(), pk=tour.pk)
        return Response(AdminCustomTourSerializer(tour).data)


class AdminCustomTourRejectView(APIView):
    """POST /api/custom-tours/admin/<uuid>/reject/"""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, tour_id):
        serializer = AdminCustomTourRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            tour = CustomTourService().reject(
                admin=request.user,
                tour_id=tour_id,
                reason=data["rejection_reason"],
                recommended_adjustments=data.get("recommended_adjustments", ""),
                reapply_enabled=data.get("reapply_enabled", False),
            )
        except CustomTour.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except CustomTourNotRejectable as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            return _validation_response(exc)
        tour = get_object_or_404(_all_custom_tours(), pk=tour.pk)
        return Response(AdminCustomTourSerializer(tour).data)