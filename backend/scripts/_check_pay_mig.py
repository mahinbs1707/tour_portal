import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

with connection.cursor() as c:
    c.execute(
        "select app, name from django_migrations where app='payments' order by id"
    )
    print("migrations", c.fetchall())
    c.execute(
        "select column_name from information_schema.columns "
        "where table_name='payments_payment' order by 1"
    )
    print("payment cols", [r[0] for r in c.fetchall()])
    c.execute(
        "select column_name from information_schema.columns "
        "where table_name='payments_paymentwindow' order by 1"
    )
    print("window cols", [r[0] for r in c.fetchall()])
