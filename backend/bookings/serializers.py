"""Booking create serializers (Story 5.1)."""

from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from bookings.models import Booking


class BookingCreateSerializer(serializers.Serializer):
    package_id = serializers.UUIDField()
    available_date_id = serializers.UUIDField()
    travelers = serializers.IntegerField(min_value=1)
    contact_name = serializers.CharField(max_length=255, trim_whitespace=True)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=64, trim_whitespace=True)
    additional_requirements = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=2000,
        trim_whitespace=True,
    )

    def validate_contact_name(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_contact_phone(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value


class BookingResponseSerializer(serializers.ModelSerializer):
    package_id = serializers.UUIDField(source="package.id", read_only=True)
    available_date_id = serializers.UUIDField(source="available_date.id", read_only=True)
    tour_date = serializers.DateField(source="available_date.tour_date", read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_window_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "reference",
            "status",
            "package_id",
            "available_date_id",
            "tour_date",
            "travelers",
            "contact_name",
            "contact_email",
            "contact_phone",
            "additional_requirements",
            "payment_status",
            "payment_window_status",
            "created_at",
        ]
        read_only_fields = fields

    def get_payment_status(self, obj: Booking) -> str | None:
        payment = obj.payments.order_by("created_at").first()
        return payment.status if payment else None

    def get_payment_window_status(self, obj: Booking) -> str | None:
        try:
            return obj.payment_window.status
        except ObjectDoesNotExist:
            return None


class BookingDetailSerializer(BookingResponseSerializer):
    """Customer history/detail shape (Story 5.3): create fields + package title.

    Booking / payment / window statuses stay separate keys. The create
    response (`BookingResponseSerializer`) is unchanged.
    """

    package_title = serializers.CharField(source="package.title", read_only=True)

    class Meta(BookingResponseSerializer.Meta):
        fields = [*BookingResponseSerializer.Meta.fields, "package_title"]
        read_only_fields = fields
