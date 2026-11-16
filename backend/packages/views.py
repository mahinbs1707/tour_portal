"""Admin package API views (IsAdminRole — AD-3 / AD-19)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminRole
from packages.models import TourPackage
from packages.serializers import TourPackageSerializer
from packages.services import PackageService


class AdminPackagePagination(PageNumberPagination):
    page_size = 20


def _validation_response(exc: DjangoValidationError) -> Response:
    if hasattr(exc, "message_dict"):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {"detail": list(getattr(exc, "messages", [str(exc)]))},
        status=status.HTTP_400_BAD_REQUEST,
    )


class AdminPackageListCreateView(ListCreateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = TourPackageSerializer
    queryset = TourPackage.objects.all()
    pagination_class = AdminPackagePagination

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            package = PackageService().create_draft(
                actor_id=request.user.id,
                data=serializer.validated_data,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(
            TourPackageSerializer(package).data,
            status=status.HTTP_201_CREATED,
        )


class AdminPackageDetailView(RetrieveUpdateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = TourPackageSerializer
    queryset = TourPackage.objects.all()
    http_method_names = ["get", "patch", "head", "options"]

    def partial_update(self, request, *args, **kwargs):
        package = self.get_object()
        serializer = self.get_serializer(package, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            package = PackageService().update(
                actor_id=request.user.id,
                package=package,
                data=serializer.validated_data,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class _AdminPackageActionMixin:
    permission_classes = [IsAdminRole]
    queryset = TourPackage.objects.all()

    def get_package(self, pk):
        try:
            return self.queryset.get(pk=pk)
        except TourPackage.DoesNotExist:
            return None


class AdminPackagePublishView(_AdminPackageActionMixin, APIView):
    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().publish(
                actor_id=request.user.id, package=package
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class AdminPackageUnpublishView(_AdminPackageActionMixin, APIView):
    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().unpublish(
                actor_id=request.user.id, package=package
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)
