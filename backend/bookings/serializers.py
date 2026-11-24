"""Booking create serializers (Story 5.1)."""

from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from django.utils import timezone

from bookings.models import Booking
from payments.eligibility import is_payment_eligible


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


class AdminBookingRejectSerializer(serializers.Serializer):
    """Reject request body (Story 6.3): required, trimmed, max 2000 chars."""

    rejection_reason = serializers.CharField(
        max_length=2000, allow_blank=False, trim_whitespace=True
    )


class AdminBookingExtendSerializer(serializers.Serializer):
    """Extend request body (Story 6.4): required future ``deadline_at``."""

    deadline_at = serializers.DateTimeField()


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
        payment = obj.payments.order_by("-created_at", "-id").first()
        return payment.status if payment else None

    def get_payment_window_status(self, obj: Booking) -> str | None:
        try:
            return obj.payment_window.status
        except ObjectDoesNotExist:
            return None


class BookingDetailSerializer(BookingResponseSerializer):
    """Customer history/detail shape (Story 5.3): create fields + package title.

    Booking / payment / window statuses stay separate keys. The create
    response (`BookingResponseSerializer`) is unchanged. Story 7.2 adds
    payment eligibility for Pay now gating.
    """

    package_title = serializers.CharField(source="package.title", read_only=True)
    payment_window_deadline_at = serializers.SerializerMethodField()
    payment_eligible = serializers.SerializerMethodField()
    amount_due = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta(BookingResponseSerializer.Meta):
        fields = [
            *BookingResponseSerializer.Meta.fields,
            "package_title",
            "rejection_reason",
            "payment_window_deadline_at",
            "payment_eligible",
            "amount_due",
            "currency",
        ]
        read_only_fields = fields

    def get_payment_window_deadline_at(self, obj: Booking) -> str | None:
        try:
            deadline = obj.payment_window.deadline_at
        except ObjectDoesNotExist:
            return None
        return deadline.isoformat() if deadline else None

    def get_payment_eligible(self, obj: Booking) -> bool:
        return is_payment_eligible(obj, now=timezone.now())

    def get_amount_due(self, obj: Booking) -> str:
        payment = obj.payments.order_by("-created_at", "-id").first()
        if payment is not None:
            return f"{payment.amount:.2f}"
        return f"{obj.package.base_price:.2f}"

    def get_currency(self, obj: Booking) -> str:
        payment = obj.payments.order_by("-created_at", "-id").first()
        if payment is not None:
            return payment.currency
        return obj.package.currency


class AdminBookingSerializer(BookingDetailSerializer):
    """Admin list/detail shape (Story 6.1).

    Adds the booking owner's account identity (`customer_full_name`,
    `customer_email`) alongside the booking contact fields already on the row.
    Booking / payment / window statuses remain separate keys. Story 6.4 adds
    payment window deadline + eligibility for Admin ops UI.
    """

    customer_full_name = serializers.CharField(
        source="customer.full_name", read_only=True
    )
    customer_email = serializers.EmailField(source="customer.email", read_only=True)

    class Meta(BookingDetailSerializer.Meta):
        fields = [
            *BookingDetailSerializer.Meta.fields,
            "customer_full_name",
            "customer_email",
        ]
        read_only_fields = fields
