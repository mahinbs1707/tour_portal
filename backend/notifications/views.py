"""Notification inbox APIs (Story 9.1)."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from notifications.services import NotificationService


class NotificationListView(APIView):
    """GET /api/notifications/ — own notifications newest first."""

    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        rows = (
            Notification.objects.filter(recipient=request.user)
            .order_by("-created_at", "-id")
        )
        return Response(NotificationSerializer(rows, many=True).data)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — badge source."""

    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()
        return Response({"count": count})


class NotificationMarkReadView(APIView):
    """POST /api/notifications/<uuid>/read/ — mark read for owner (FR-NOTIF-11a)."""

    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request, notification_id):
        service = NotificationService()
        try:
            service.mark_read(
                notification_id=notification_id,
                recipient_id=request.user.id,
            )
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        row = Notification.objects.get(pk=notification_id, recipient=request.user)
        return Response(NotificationSerializer(row).data)