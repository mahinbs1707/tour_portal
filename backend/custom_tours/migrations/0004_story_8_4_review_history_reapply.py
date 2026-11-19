"""Story 8.4 — review history + review_cycle."""

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("custom_tours", "0003_story_8_3_admin_decision_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="customtour",
            name="review_cycle",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.CreateModel(
            name="CustomTourReview",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("cycle", models.PositiveIntegerField()),
                (
                    "decision",
                    models.CharField(
                        choices=[
                            ("REJECTED", "Rejected"),
                            ("APPROVED", "Approved"),
                        ],
                        max_length=16,
                    ),
                ),
                ("rejection_reason", models.TextField(blank=True, default="")),
                (
                    "recommended_adjustments",
                    models.TextField(blank=True, default=""),
                ),
                ("decided_at", models.DateTimeField()),
                ("admin_id", models.UUIDField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "custom_tour",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="reviews",
                        to="custom_tours.customtour",
                    ),
                ),
            ],
            options={
                "ordering": ["cycle", "created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="customtourreview",
            constraint=models.UniqueConstraint(
                fields=("custom_tour", "cycle"),
                name="uniq_custom_tour_review_cycle",
            ),
        ),
    ]