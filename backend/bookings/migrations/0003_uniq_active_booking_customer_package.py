# Generated manually for one active booking per customer per package.

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("packages", "0002_story_2_2_available_dates"),
        ("bookings", "0002_story_travelers_min_validator"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="booking",
            constraint=models.UniqueConstraint(
                condition=models.Q(status__in=["PENDING", "APPROVED"]),
                fields=("customer", "package"),
                name="uniq_active_booking_customer_package",
            ),
        ),
    ]
