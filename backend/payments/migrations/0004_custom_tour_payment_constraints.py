"""Backfill custom-tour windows, then XOR owner constraints (separate tx)."""

from __future__ import annotations

from datetime import timedelta

from django.db import migrations, models
from django.db.models import Q


def backfill_custom_tour_windows(apps, schema_editor):
    CustomTour = apps.get_model("custom_tours", "CustomTour")
    Payment = apps.get_model("payments", "Payment")
    PaymentWindow = apps.get_model("payments", "PaymentWindow")

    for tour in CustomTour.objects.all().iterator():
        if PaymentWindow.objects.filter(custom_tour_id=tour.id).exists():
            continue
        Payment.objects.create(
            custom_tour_id=tour.id,
            booking_id=None,
            status="UNPAID",
            amount=tour.estimated_budget,
            currency=tour.currency,
            provider="MOCK",
        )
        window = PaymentWindow.objects.create(
            custom_tour_id=tour.id,
            booking_id=None,
            status="NOT_OPEN",
            opened_at=None,
            deadline_at=None,
        )
        if tour.status == "APPROVED" and tour.approved_at is not None:
            opened = tour.approved_at
            window.status = "OPEN"
            window.opened_at = opened
            window.deadline_at = opened + timedelta(hours=24)
            window.save(
                update_fields=["status", "opened_at", "deadline_at", "updated_at"]
            )


class Migration(migrations.Migration):
    # Postgres rejects ADD CONSTRAINT in the same transaction as bulk INSERT
    # that fires deferred triggers on payments_payment.
    atomic = False

    dependencies = [
        ("payments", "0003_custom_tour_payment"),
    ]

    operations = [
        migrations.RunPython(backfill_custom_tour_windows, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="payment",
            name="payments_payment_unique_success_per_booking",
        ),
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.CheckConstraint(
                condition=(
                    (Q(booking__isnull=False) & Q(custom_tour__isnull=True))
                    | (Q(booking__isnull=True) & Q(custom_tour__isnull=False))
                ),
                name="payments_payment_exactly_one_owner",
            ),
        ),
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.UniqueConstraint(
                condition=Q(status="SUCCESS", booking__isnull=False),
                fields=("booking",),
                name="payments_payment_unique_success_per_booking",
            ),
        ),
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.UniqueConstraint(
                condition=Q(status="SUCCESS", custom_tour__isnull=False),
                fields=("custom_tour",),
                name="payments_payment_unique_success_per_custom_tour",
            ),
        ),
        migrations.AddConstraint(
            model_name="paymentwindow",
            constraint=models.CheckConstraint(
                condition=(
                    (Q(booking__isnull=False) & Q(custom_tour__isnull=True))
                    | (Q(booking__isnull=True) & Q(custom_tour__isnull=False))
                ),
                name="payments_window_exactly_one_owner",
            ),
        ),
    ]
