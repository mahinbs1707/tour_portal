# Generated manually for Story 2.1

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="TourPackage",
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
                ("title", models.CharField(max_length=255)),
                ("short_description", models.TextField()),
                ("full_description", models.TextField()),
                ("destinations", models.TextField()),
                ("duration_days", models.PositiveIntegerField()),
                ("duration_nights", models.PositiveIntegerField()),
                ("starting_location", models.CharField(max_length=255)),
                ("base_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(max_length=16)),
                ("cover_image", models.CharField(blank=True, default="", max_length=512)),
                ("additional_images", models.JSONField(blank=True, default=list)),
                ("included_services", models.TextField()),
                ("excluded_services", models.TextField()),
                ("itinerary", models.TextField()),
                ("difficulty", models.CharField(blank=True, default="", max_length=64)),
                ("cancellation_policy", models.TextField(blank=True, default="")),
                ("additional_info", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[("DRAFT", "Draft"), ("PUBLISHED", "Published")],
                        db_index=True,
                        default="DRAFT",
                        max_length=16,
                    ),
                ),
                ("is_featured", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
