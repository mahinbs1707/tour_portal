"""Payment API serializers (Story 7.1)."""

from __future__ import annotations

from rest_framework import serializers

from payments.models import Payment, PaymentStatus


class PaymentAttemptSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=[
            PaymentStatus.SUCCESS,
            PaymentStatus.FAILED,
            PaymentStatus.CANCELLED,
        ]
    )


class PaymentAttemptResponseSerializer(serializers.ModelSerializer):
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking_id",
            "status",
            "amount",
            "currency",
            "provider",
            "attempt_reference",
            "created_at",
        ]
        read_only_fields = fields