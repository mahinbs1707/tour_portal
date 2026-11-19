import { useEffect, useRef, useState } from "react";
import { messages } from "../../i18n/messages.js";
import {
  formatTimeRemaining,
  isPaymentWindowExpired,
  msUntilDeadline,
  shouldShowPaymentCountdown,
} from "./paymentWindowTiming.js";

const TICK_MS = 60_000;

/**
 * Polite aria-live countdown for payment window (UX-DR12, Story 7.3).
 */
export function PaymentWindowCountdown({ booking, testIdPrefix = "payment-countdown" }) {
  const [liveText, setLiveText] = useState("");
  const expiredAnnouncedRef = useRef(false);
  const bookingRef = useRef(booking);
  bookingRef.current = booking;
  const showCountdown = Boolean(booking && shouldShowPaymentCountdown(booking));

  useEffect(() => {
    expiredAnnouncedRef.current = false;
  }, [booking?.id]);

  useEffect(() => {
    if (!booking) {
      return undefined;
    }

    function tick() {
      const current = bookingRef.current;
      if (!current) {
        return;
      }
      const expired = isPaymentWindowExpired(current);
      if (expired) {
        if (!expiredAnnouncedRef.current) {
          expiredAnnouncedRef.current = true;
          setLiveText(messages.booking.payUnavailableAnnounce);
        }
        return;
      }
      if (!shouldShowPaymentCountdown(current)) {
        setLiveText("");
        return;
      }
      const ms = msUntilDeadline(current.payment_window_deadline_at);
      const remaining = formatTimeRemaining(ms);
      setLiveText(
        messages.booking.countdownLive.replace("{time}", remaining),
      );
    }

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [
    booking,
    booking?.payment_window_deadline_at,
    booking?.payment_window_status,
    booking?.payment_eligible,
    booking?.payment_status,
    booking?.status,
  ]);

  if (!booking || booking.payment_status === "SUCCESS") {
    return null;
  }

  const ms = booking.payment_window_deadline_at
    ? msUntilDeadline(booking.payment_window_deadline_at)
    : 0;
  const visibleRemaining =
    showCountdown && ms > 0
      ? messages.booking.countdownVisible.replace(
          "{time}",
          formatTimeRemaining(ms),
        )
      : "";

  return (
    <div className="mt-4" data-testid={`${testIdPrefix}-wrap`}>
      {visibleRemaining ? (
        <p className="m-0 text-body-sm font-semibold" data-testid={`${testIdPrefix}-visible`}>
          {visibleRemaining}
        </p>
      ) : null}
      <p
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid={`${testIdPrefix}-live`}
      >
        {liveText}
      </p>
    </div>
  );
}