"""Dashboard read APIs (Stories 9.2–9.3)."""

from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from common.permissions import IsAdminRole, IsCustomer
from dashboard.services import AdminDashboardQueryService, CustomerDashboardQueryService


class CustomerDashboardView(APIView):
    """GET /api/dashboard/customer/ — FR-CUST-01 aggregate tiles."""

    permission_classes = [IsCustomer]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        counts = CustomerDashboardQueryService.snapshot_for_customer(
            customer=request.user,
        )
        return Response(
            {
                "pending_bookings": counts.pending_bookings,
                "open_payment_windows": counts.open_payment_windows,
                "unread_notifications": counts.unread_notifications,
            }
        )


class AdminDashboardView(APIView):
    """GET /api/dashboard/admin/ — FR-ADM-02 operational metrics."""

    permission_classes = [IsAdminRole]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        counts = AdminDashboardQueryService.snapshot()
        return Response(
            {
                "total_packages": counts.total_packages,
                "published_packages": counts.published_packages,
                "draft_packages": counts.draft_packages,
                "pending_bookings": counts.pending_bookings,
                "approved_bookings": counts.approved_bookings,
                "rejected_bookings": counts.rejected_bookings,
                "pending_custom_tours": counts.pending_custom_tours,
                "approved_custom_tours": counts.approved_custom_tours,
                "rejected_custom_tours": counts.rejected_custom_tours,
            }
        )