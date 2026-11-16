"""Admin package serializers (Story 2.1)."""

from __future__ import annotations

from rest_framework import serializers

from packages.models import TourPackage

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
