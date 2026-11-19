"""Dashboard read APIs (Story 9.2)."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from common.permissions import IsCustomer
from dashboard.services import CustomerDashboardQueryService


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