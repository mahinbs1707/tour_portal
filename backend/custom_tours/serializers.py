"""Custom tour create serializers (Story 8.1)."""

from __future__ import annotations

from rest_framework import serializers

from custom_tours.models import CustomTour, CustomTourReview


class CustomTourCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, trim_whitespace=True)
    destination = serializers.CharField(max_length=500, trim_whitespace=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    travelers = serializers.IntegerField(min_value=1)
    estimated_budget = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, coerce_to_string=False
    )
    currency = serializers.CharField(max_length=16, trim_whitespace=True)
    accommodation_preferences = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )
    transportation_preferences = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )
    preferred_activities = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )
    additional_requirements = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )

    def validate_title(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_destination(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_estimated_budget(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Estimated budget must be greater than zero."
            )
        return value

    def validate_currency(self, value: str) -> str:
        code = (value or "").strip().upper()
        if not code:
            raise serializers.ValidationError("Currency is required.")
        if len(code) > 16:
            raise serializers.ValidationError("Currency code is too long.")
        return code

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )
        return attrs


class CustomTourResponseSerializer(serializers.ModelSerializer):
    """Create response (Story 8.1)."""

    class Meta:
        model = CustomTour
        fields = [
            "id",
            "status",
            "title",
            "destination",
            "start_date",
            "end_date",
            "travelers",
            "estimated_budget",
            "currency",
            "accommodation_preferences",
            "transportation_preferences",
            "preferred_activities",
            "additional_requirements",
            "created_at",
        ]
        read_only_fields = fields


class CustomTourReviewSerializer(serializers.ModelSerializer):
    """Prior review cycle row (Story 8.4)."""

    class Meta:
        model = CustomTourReview
        fields = [
            "cycle",
            "decision",
            "rejection_reason",
            "recommended_adjustments",
            "decided_at",
        ]
        read_only_fields = fields


class CustomTourDetailSerializer(CustomTourResponseSerializer):
    """Customer history/detail (Story 8.2)."""

    review_history = CustomTourReviewSerializer(
        source="reviews", many=True, read_only=True
    )

    class Meta(CustomTourResponseSerializer.Meta):
        fields = [
            *CustomTourResponseSerializer.Meta.fields,
            "rejection_reason",
            "recommended_adjustments",
            "reapply_enabled",
            "review_cycle",
            "approved_at",
            "updated_at",
            "review_history",
        ]
        read_only_fields = fields


class AdminCustomTourRejectSerializer(serializers.Serializer):
    """Reject body (Story 8.3)."""

    rejection_reason = serializers.CharField(
        max_length=2000, allow_blank=False, trim_whitespace=True
    )
    recommended_adjustments = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )
    reapply_enabled = serializers.BooleanField(required=False, default=False)


class AdminCustomTourSerializer(CustomTourDetailSerializer):
    """Admin list/detail shape (Story 8.3)."""

    customer_full_name = serializers.CharField(
        source="customer.full_name", read_only=True
    )
    customer_email = serializers.EmailField(source="customer.email", read_only=True)

    class Meta(CustomTourDetailSerializer.Meta):
        fields = [
            *CustomTourDetailSerializer.Meta.fields,
            "customer_full_name",
            "customer_email",
        ]
        read_only_fields = fields