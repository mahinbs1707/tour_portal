# Story 7.1 — at most one SUCCESS payment row per booking

from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_story_5_1_payments"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.UniqueConstraint(
                condition=Q(status="SUCCESS"),
                fields=("booking",),
                name="payments_payment_unique_success_per_booking",
            ),
        ),
    ]