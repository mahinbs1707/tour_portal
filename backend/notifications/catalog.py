"""Human-readable notification copy from MVP event keys (FR-NOTIF-09)."""

from __future__ import annotations

from typing import Any


def _ref(payload: dict[str, Any]) -> str:
    ref = (payload.get("reference") or "").strip()
    return ref


def format_notification_message(*, event_key: str, payload: dict[str, Any] | None) -> str:
    """Stable one-line inbox message for a stored notification row."""
    data = payload or {}
    ref = _ref(data)
    title = (data.get("title") or "").strip()

    messages = {
        "booking.submitted": (
            f"Booking request{f' {ref}' if ref else ''} was submitted and is pending Admin review."
        ),
        "booking.approved": (
            f"Booking{f' {ref}' if ref else ''} was approved. You have 24 hours to complete mock payment."
        ),
        "booking.rejected": (
            f"Booking{f' {ref}' if ref else ''} was rejected."
            + (
                f" Reason: {data.get('rejection_reason', '').strip()}"
                if data.get("rejection_reason")
                else ""
            )
        ),
        "booking.cancelled": (
            f"Booking{f' {ref}' if ref else ''} was cancelled."
        ),
        "payment.success": (
            f"Mock payment succeeded for booking{f' {ref}' if ref else ''}."
        ),
        "payment.failed": (
            f"Mock payment failed for booking{f' {ref}' if ref else ''}. You can retry while the window is open."
        ),
        "payment.window_expired": (
            f"Payment window expired for booking{f' {ref}' if ref else ''}."
        ),
        "custom_tour.submitted": (
            f"Custom tour{f' “{title}”' if title else ''} was submitted and is pending Admin review."
        ),
        "custom_tour.approved": (
            f"Custom tour{f' “{title}”' if title else ''} was approved."
        ),
        "custom_tour.rejected": (
            f"Custom tour{f' “{title}”' if title else ''} was rejected."
            + (
                f" Reason: {data.get('rejection_reason', '').strip()}"
                if data.get("rejection_reason")
                else ""
            )
        ),
        "custom_tour.reapply_enabled": (
            f"You can resubmit custom tour{f' “{title}”' if title else ''}."
        ),
        "custom_tour.resubmitted": (
            f"Custom tour{f' “{title}”' if title else ''} was resubmitted and is pending review."
        ),
    }
    return messages.get(
        event_key,
        f"Update for {event_key.replace('.', ' ')}.",
    )


def resolve_customer_deeplink(
    *,
    event_key: str,
    entity_type: str,
    entity_id: str,
    payload: dict[str, Any] | None,
) -> str | None:
    """Customer shell path for a notification row, or None if not navigable."""
    data = payload or {}
    booking_id: str | None = None
    if entity_type == "booking":
        booking_id = str(entity_id)
    elif entity_type == "payment":
        raw = data.get("booking_id")
        if raw:
            booking_id = str(raw)

    if event_key in ("booking.approved", "payment.failed") and booking_id:
        return f"/app/customer/bookings/{booking_id}/pay"

    if entity_type == "booking" and booking_id:
        return f"/app/customer/bookings/{booking_id}"
    if entity_type == "custom_tour":
        tour_id = str(entity_id).split(":", 1)[0]
        return f"/app/customer/custom-tours/{tour_id}"
    if entity_type == "payment" and booking_id:
        return f"/app/customer/bookings/{booking_id}"
    return None