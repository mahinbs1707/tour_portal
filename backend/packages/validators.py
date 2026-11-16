"""Shared bookable-date advance rules (AD-20).

Owned by packages; callable later from bookings and custom_tours.
"""

from __future__ import annotations

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

ADVANCE_CALENDAR_DAYS = 7


def business_tz() -> ZoneInfo:
    name = getattr(settings, "BUSINESS_TIMEZONE", None) or settings.TIME_ZONE
    return ZoneInfo(name)


def today_in_business_tz() -> date:
    return timezone.now().astimezone(business_tz()).date()


def min_bookable_date(*, as_of: date | None = None) -> date:
    """First calendar date that is at least 7 days after `as_of` (business TZ)."""
    base = as_of or today_in_business_tz()
    return base + timedelta(days=ADVANCE_CALENDAR_DAYS)


def is_within_advance_window(tour_date: date, *, as_of: date | None = None) -> bool:
    """True when tour_date is strictly before min_bookable_date (needs Admin warning)."""
    return tour_date < min_bookable_date(as_of=as_of)


def assert_bookable_date(tour_date: date, *, as_of: date | None = None) -> None:
    """Raise ValueError when tour_date is too soon for Customer booking (Epic 5+)."""
    minimum = min_bookable_date(as_of=as_of)
    if tour_date < minimum:
        raise ValueError(
            f"Travel date must be on or after {minimum.isoformat()} "
            f"({ADVANCE_CALENDAR_DAYS} calendar days ahead, "
            f"{getattr(settings, 'BUSINESS_TIMEZONE', settings.TIME_ZONE)})."
        )
