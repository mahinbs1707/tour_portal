"""Dashboard query aggregates (AD-18 / Stories 9.2–9.3)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from bookings.models import Booking, BookingStatus
from custom_tours.models import CustomTour, CustomTourStatus
from notifications.models import Notification
from packages.models import PackageStatus, TourPackage
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


@dataclass(frozen=True)
class AdminDashboardSnapshot:
    total_packages: int
    published_packages: int
    draft_packages: int
    pending_bookings: int
    approved_bookings: int
    rejected_bookings: int
    pending_custom_tours: int
    approved_custom_tours: int
    rejected_custom_tours: int


class AdminDashboardQueryService:
    """Read-only Admin operational metrics (FR-ADM-02)."""

    @staticmethod
    def snapshot() -> AdminDashboardSnapshot:
        return AdminDashboardSnapshot(
            total_packages=TourPackage.objects.count(),
            published_packages=TourPackage.objects.filter(
                status=PackageStatus.PUBLISHED
            ).count(),
            draft_packages=TourPackage.objects.filter(
                status=PackageStatus.DRAFT
            ).count(),
            pending_bookings=Booking.objects.filter(
                status=BookingStatus.PENDING
            ).count(),
            approved_bookings=Booking.objects.filter(
                status=BookingStatus.APPROVED
            ).count(),
            rejected_bookings=Booking.objects.filter(
                status=BookingStatus.REJECTED
            ).count(),
            pending_custom_tours=CustomTour.objects.filter(
                status=CustomTourStatus.PENDING
            ).count(),
            approved_custom_tours=CustomTour.objects.filter(
                status=CustomTourStatus.APPROVED
            ).count(),
            rejected_custom_tours=CustomTour.objects.filter(
                status=CustomTourStatus.REJECTED
            ).count(),
        )