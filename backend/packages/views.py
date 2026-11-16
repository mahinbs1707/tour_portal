"""Package API views — Admin (IsAdminRole) + public catalog (AllowAny)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminRole
from packages.models import AvailableDate, PackageStatus, TourPackage
from packages.serializers import (
    AvailableDateSerializer,
    PublicPackageCardSerializer,
    PublicPackageDetailSerializer,
    TourPackageSerializer,
)
from packages.services import (
    PackageService,
    featured_published,
    get_published,
    published,
)

# Shared default page size for Admin + public catalog lists (Story 3.1 / AD-11).
PACKAGE_LIST_PAGE_SIZE = 20

_FEATURED_TRUE_FALSE = ("true", "false")


class AdminPackagePagination(PageNumberPagination):
    page_size = PACKAGE_LIST_PAGE_SIZE


class PublicPackagePagination(PageNumberPagination):
    page_size = PACKAGE_LIST_PAGE_SIZE


class PublicPackageListView(ListAPIView):
    """GET /api/packages/ — published-only catalog cards; optional ?featured=true|false."""

    permission_classes = [AllowAny]
    serializer_class = PublicPackageCardSerializer
    pagination_class = PublicPackagePagination

    def list(self, request, *args, **kwargs):
        featured_param = request.query_params.get("featured")
        if featured_param is not None and featured_param.lower() not in _FEATURED_TRUE_FALSE:
            return Response(
                {"featured": ["Invalid featured filter. Use true or false."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        featured_param = self.request.query_params.get("featured")
        if featured_param is not None and featured_param.lower() in _FEATURED_TRUE_FALSE:
            if featured_param.lower() == "true":
                return featured_published()
            return published().filter(is_featured=False)
        return published()


class PublicPackageDetailView(RetrieveAPIView):
    """GET /api/packages/<uuid:pk>/ — published-only detail; draft → 404."""

    permission_classes = [AllowAny]
    serializer_class = PublicPackageDetailSerializer
    lookup_field = "pk"

    def get_object(self):
        return get_published(self.kwargs["pk"])


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

    def list(self, request, *args, **kwargs):
        status_param = request.query_params.get("status")
        featured_param = request.query_params.get("featured")
        if status_param is not None and status_param not in PackageStatus.values:
            return Response(
                {"status": ["Invalid status filter. Use DRAFT or PUBLISHED."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if featured_param is not None and featured_param.lower() not in (
            "true",
            "false",
        ):
            return Response(
                {"featured": ["Invalid featured filter. Use true or false."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def filter_queryset(self, queryset):
        status_param = self.request.query_params.get("status")
        featured_param = self.request.query_params.get("featured")
        if status_param in PackageStatus.values:
            queryset = queryset.filter(status=status_param)
        if featured_param is not None and featured_param.lower() in ("true", "false"):
            queryset = queryset.filter(
                is_featured=featured_param.lower() == "true"
            )
        return queryset

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


class AdminPackageFeatureView(_AdminPackageActionMixin, APIView):
    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().feature(
                actor_id=request.user.id, package=package
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class AdminPackageUnfeatureView(_AdminPackageActionMixin, APIView):
    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().unfeature(
                actor_id=request.user.id, package=package
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class AdminAvailableDateListCreateView(_AdminPackageActionMixin, APIView):
    def get(self, request, package_id):
        package = self.get_package(package_id)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        rows = AvailableDate.objects.filter(package=package)
        return Response(AvailableDateSerializer(rows, many=True).data)

    def post(self, request, package_id):
        package = self.get_package(package_id)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AvailableDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            row = PackageService().create_available_date(
                actor_id=request.user.id,
                package=package,
                tour_date=serializer.validated_data["tour_date"],
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(
            AvailableDateSerializer(row).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAvailableDateDetailView(_AdminPackageActionMixin, APIView):
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def _get_row(self, package_id, date_id):
        package = self.get_package(package_id)
        if package is None:
            return None, Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        try:
            row = AvailableDate.objects.get(pk=date_id, package=package)
        except AvailableDate.DoesNotExist:
            return None, Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return row, None

    def get(self, request, package_id, date_id):
        row, error = self._get_row(package_id, date_id)
        if error:
            return error
        return Response(AvailableDateSerializer(row).data)

    def patch(self, request, package_id, date_id):
        row, error = self._get_row(package_id, date_id)
        if error:
            return error
        serializer = AvailableDateSerializer(row, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = PackageService().update_available_date(
                actor_id=request.user.id,
                row=row,
                tour_date=serializer.validated_data.get("tour_date"),
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(AvailableDateSerializer(updated).data)

    def delete(self, request, package_id, date_id):
        row, error = self._get_row(package_id, date_id)
        if error:
            return error
        try:
            PackageService().delete_available_date(row=row)
        except DjangoValidationError as exc:
            # Referenced dates must not be hard-deleted.
            if hasattr(exc, "message_dict"):
                return Response(exc.message_dict, status=status.HTTP_409_CONFLICT)
            return Response(
                {"detail": list(getattr(exc, "messages", [str(exc)]))},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAvailableDateDeactivateView(_AdminPackageActionMixin, APIView):
    def post(self, request, package_id, date_id):
        package = self.get_package(package_id)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            row = AvailableDate.objects.get(pk=date_id, package=package)
        except AvailableDate.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            row = PackageService().deactivate_available_date(
                actor_id=request.user.id, row=row
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(AvailableDateSerializer(row).data)


def _uploaded_file(request):
    uploaded = request.FILES.get("file")
    if uploaded is None and len(request.FILES) == 1:
        uploaded = next(iter(request.FILES.values()))
    return uploaded


class AdminPackageCoverMediaView(_AdminPackageActionMixin, APIView):
    """POST/DELETE …/admin/<pk>/media/cover/ — Admin cover upload/clear."""

    http_method_names = ["post", "delete", "head", "options"]

    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        uploaded = _uploaded_file(request)
        if uploaded is None:
            return Response(
                {"file": ["No file was uploaded."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            package = PackageService().set_cover_image(
                actor_id=request.user.id,
                package=package,
                uploaded=uploaded,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)

    def delete(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().clear_cover_image(
                actor_id=request.user.id,
                package=package,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class AdminPackageAdditionalMediaView(_AdminPackageActionMixin, APIView):
    """POST …/admin/<pk>/media/additional/ — append additional image."""

    http_method_names = ["post", "head", "options"]

    def post(self, request, pk):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        uploaded = _uploaded_file(request)
        if uploaded is None:
            return Response(
                {"file": ["No file was uploaded."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            package = PackageService().append_additional_image(
                actor_id=request.user.id,
                package=package,
                uploaded=uploaded,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)


class AdminPackageAdditionalMediaIndexView(_AdminPackageActionMixin, APIView):
    """DELETE …/admin/<pk>/media/additional/<index>/ — remove by index."""

    http_method_names = ["delete", "head", "options"]

    def delete(self, request, pk, index):
        package = self.get_package(pk)
        if package is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            package = PackageService().remove_additional_image(
                actor_id=request.user.id,
                package=package,
                index=index,
            )
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(TourPackageSerializer(package).data)
