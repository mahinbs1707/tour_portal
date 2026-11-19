# Story 8.3 — Admin approve/reject + reapply flag

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("custom_tours", "0002_story_8_2_rejection_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="customtour",
            name="reapply_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="customtour",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]