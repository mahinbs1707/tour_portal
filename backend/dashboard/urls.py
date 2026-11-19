from django.urls import path

from dashboard.views import CustomerDashboardView

urlpatterns = [
    path("customer/", CustomerDashboardView.as_view(), name="customer-dashboard"),
]