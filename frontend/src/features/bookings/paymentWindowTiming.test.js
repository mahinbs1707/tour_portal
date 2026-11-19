import { describe, expect, it } from "vitest";
import {
  formatTimeRemaining,
  msUntilDeadline,
  shouldShowPaymentCountdown,
} from "./paymentWindowTiming.js";

describe("paymentWindowTiming", () => {
  it("formats minutes and hours", () => {
    expect(formatTimeRemaining(30 * 60_000)).toBe("30 min");
    expect(formatTimeRemaining(90 * 60_000)).toBe("1 hr 30 min");
  });

  it("detects future deadline countdown eligibility", () => {
    const booking = {
      status: "APPROVED",
      payment_status: "UNPAID",
      payment_window_status: "OPEN",
      payment_window_deadline_at: new Date(Date.now() + 60_000).toISOString(),
    };
    expect(shouldShowPaymentCountdown(booking)).toBe(true);
    expect(msUntilDeadline(booking.payment_window_deadline_at)).toBeGreaterThan(0);
  });
});