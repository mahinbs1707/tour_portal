"""Package serializers — Admin write + public card/detail (Stories 2.1 / 3.1 / 3.2)."""

from __future__ import annotations

from rest_framework import serializers

from packages.models import AvailableDate, TourPackage
from packages.services import active_available_dates, compute_bookability

WRITABLE_FIELDS = (
    "title",
    "short_description",
    "full_description",
    "destinations",
    "duration_days",
    "duration_nights",
    "starting_location",
    "base_price",
    "currency",
    "included_services",
    "excluded_services",
    "itinerary",
    "difficulty",
    "cancellation_policy",
    "additional_info",
)

REQUIRED_TEXT_FIELDS = (
    "title",
    "short_description",
    "full_description",
    "destinations",
    "starting_location",
    "included_services",
    "excluded_services",
    "itinerary",
)


class TourPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackage
        fields = (
            "id",
            *WRITABLE_FIELDS,
            "cover_image",
            "additional_images",
            "status",
            "is_featured",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "cover_image",
            "additional_images",
            "status",
            "is_featured",
            "created_at",
            "updated_at",
        )

    def validate_base_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Base price must be greater than zero.")
        return value

    def validate_currency(self, value: str) -> str:
        code = (value or "").strip().upper()
        if not code:
            raise serializers.ValidationError("Currency is required.")
        if len(code) > 16:
            raise serializers.ValidationError("Currency code is too long.")
        return code

    def validate_duration_days(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Duration days must be at least 1.")
        return value

    def validate_duration_nights(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Duration nights cannot be negative.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        for field in REQUIRED_TEXT_FIELDS:
            if field not in attrs:
                continue
            value = attrs[field]
            if isinstance(value, str) and not value.strip():
                raise serializers.ValidationError(
                    {field: "This field may not be blank."}
                )
            if isinstance(value, str):
                attrs[field] = value.strip()
        return attrs


class AvailableDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailableDate
        fields = (
            "id",
            "package",
            "tour_date",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "package", "is_active", "created_at", "updated_at")


class PublicPackageCardSerializer(serializers.ModelSerializer):
    """Read-only public catalog card — scoped fields only (Story 3.1)."""

    class Meta:
        model = TourPackage
        fields = (
            "id",
            "title",
            "cover_image",
            "short_description",
            "destinations",
            "duration_days",
            "duration_nights",
            "base_price",
            "currency",
        )
        read_only_fields = fields


class PublicAvailableDateSerializer(serializers.ModelSerializer):
    """Active public travel date row (Story 3.2)."""

    class Meta:
        model = AvailableDate
        fields = ("id", "tour_date")
        read_only_fields = fields


class PublicPackageDetailSerializer(serializers.ModelSerializer):
    """
    Read-only public detail — FR-CAT-06 sections + active dates + bookability.
    Not the Admin serializer contract (Story 3.2).
    """

    available_dates = serializers.SerializerMethodField()
    is_bookable = serializers.SerializerMethodField()
    unavailable_reason = serializers.SerializerMethodField()

    class Meta:
        model = TourPackage
        fields = (
            "id",
            "title",
            "cover_image",
            "additional_images",
            "short_description",
            "full_description",
            "destinations",
            "duration_days",
            "duration_nights",
            "starting_location",
            "available_dates",
            "difficulty",
            "base_price",
            "currency",
            "included_services",
            "excluded_services",
            "itinerary",
            "cancellation_policy",
            "additional_info",
            "is_bookable",
            "unavailable_reason",
        )
        read_only_fields = fields

    def _active_dates_list(self, obj: TourPackage) -> list:
        cache = self.context.setdefault("_detail_active_dates", {})
        key = str(obj.pk)
        if key not in cache:
            cache[key] = list(active_available_dates(obj))
        return cache[key]

    def get_available_dates(self, obj: TourPackage):
        return PublicAvailableDateSerializer(
            self._active_dates_list(obj),
            many=True,
        ).data

    def _bookability(self, obj: TourPackage) -> tuple[bool, str | None]:
        cache = self.context.setdefault("_bookability_cache", {})
        key = str(obj.pk)
        if key not in cache:
            cache[key] = compute_bookability(
                obj,
                active_dates=self._active_dates_list(obj),
            )
        return cache[key]

    def get_is_bookable(self, obj: TourPackage) -> bool:
        bookable, _ = self._bookability(obj)
        return bookable

    def get_unavailable_reason(self, obj: TourPackage) -> str | None:
        bookable, reason = self._bookability(obj)
        return None if bookable else reason
