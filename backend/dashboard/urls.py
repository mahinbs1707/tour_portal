from django.urls import path

from dashboard.views import AdminDashboardView, CustomerDashboardView

urlpatterns = [
    path("customer/", CustomerDashboardView.as_view(), name="customer-dashboard"),
    path("admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
]