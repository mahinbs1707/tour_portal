"""Dashboard query aggregates (AD-18 / Story 9.2)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from bookings.models import Booking, BookingStatus
from notifications.models import Notification
from payments.models import PaymentStatus, PaymentWindowStatus


@dataclass(frozen=True)
class CustomerDashboardSnapshot:
    pending_bookings: int
    open_payment_windows: int
    unread_notifications: int


class CustomerDashboardQueryService:
    """Read-only Customer KPI counts — single source for dashboard tiles."""

    @staticmethod
    def snapshot_for_customer(*, customer, now: datetime | None = None) -> CustomerDashboardSnapshot:
        instant = now or timezone.now()
        pending_bookings = Booking.objects.filter(
            customer=customer,
            status=BookingStatus.PENDING,
        ).count()
        open_payment_windows = (
            Booking.objects.filter(
                customer=customer,
                status=BookingStatus.APPROVED,
                payment_window__status=PaymentWindowStatus.OPEN,
                payment_window__deadline_at__gt=instant,
            )
            .exclude(payments__status=PaymentStatus.SUCCESS)
            .distinct()
            .count()
        )
        unread_notifications = Notification.objects.filter(
            recipient=customer,
            is_read=False,
        ).count()
        return CustomerDashboardSnapshot(
            pending_bookings=pending_bookings,
            open_payment_windows=open_payment_windows,
            unread_notifications=unread_notifications,
        )