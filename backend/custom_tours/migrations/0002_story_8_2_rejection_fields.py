# Story 8.2 — customer-visible rejection guidance (written by Admin in 8.3).

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("custom_tours", "0001_story_8_1_custom_tours"),
    ]

    operations = [
        migrations.AddField(
            model_name="customtour",
            name="rejection_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="customtour",
            name="recommended_adjustments",
            field=models.TextField(blank=True, default=""),
        ),
    ]