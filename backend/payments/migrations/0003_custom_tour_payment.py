"""Allow Payment / PaymentWindow to reference a custom tour (nullable booking)."""

from __future__ import annotations

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0002_story_travelers_min_validator"),
        ("custom_tours", "0004_story_8_4_review_history_reapply"),
        ("payments", "0002_story_7_1_unique_success_per_booking"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="custom_tour",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payments",
                to="custom_tours.customtour",
            ),
        ),
        migrations.AddField(
            model_name="paymentwindow",
            name="custom_tour",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payment_window",
                to="custom_tours.customtour",
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="booking",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payments",
                to="bookings.booking",
            ),
        ),
        migrations.AlterField(
            model_name="paymentwindow",
            name="booking",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payment_window",
                to="bookings.booking",
            ),
        ),
    ]
