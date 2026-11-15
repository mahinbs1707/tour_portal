from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_accounts"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="user",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(role="ADMIN", is_staff=True)
                    | models.Q(role="CUSTOMER", is_staff=False)
                ),
                name="accounts_user_role_staff_matrix",
            ),
        ),
    ]
