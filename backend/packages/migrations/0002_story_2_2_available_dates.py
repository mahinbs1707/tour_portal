# Generated manually for Story 2.2

import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("packages", "0001_story_2_1_audit_and_packages"),
    ]

    operations = [
        migrations.CreateModel(
            name="AvailableDate",
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
                ("tour_date", models.DateField(db_index=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "package",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="available_dates",
                        to="packages.tourpackage",
                    ),
                ),
            ],
            options={
                "ordering": ["tour_date"],
            },
        ),
        migrations.AddConstraint(
            model_name="availabledate",
            constraint=models.UniqueConstraint(
                fields=("package", "tour_date"),
                name="uniq_package_tour_date",
            ),
        ),
    ]
