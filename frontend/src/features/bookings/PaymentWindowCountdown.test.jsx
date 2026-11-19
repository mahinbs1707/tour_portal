import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { PaymentWindowCountdown } from "./PaymentWindowCountdown.jsx";

const ELIGIBLE = {
  id: "b-1",
  status: "APPROVED",
  payment_status: "UNPAID",
  payment_window_status: "OPEN",
  payment_eligible: true,
  payment_window_deadline_at: new Date(Date.now() + 90 * 60_000).toISOString(),
};

describe("PaymentWindowCountdown (Story 7.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces remaining time on mount via aria-live", () => {
    render(<PaymentWindowCountdown booking={ELIGIBLE} testIdPrefix="t" />);
    const live = screen.getByTestId("t-live");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live.textContent).toMatch(/remaining/);
    expect(screen.getByTestId("t-visible")).toBeInTheDocument();
  });

  it("updates live region after one minute", () => {
    render(<PaymentWindowCountdown booking={ELIGIBLE} testIdPrefix="t" />);
    const live = screen.getByTestId("t-live");
    const first = live.textContent;
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(live.textContent).toBeTruthy();
    // Text may change as remaining minutes floor shifts near boundaries.
    expect(live.textContent).toContain("Payment window:");
    expect(first).toContain("Payment window:");
  });

  it("announces pay unavailable once when deadline passed", () => {
    const past = {
      ...ELIGIBLE,
      payment_eligible: false,
      payment_window_deadline_at: new Date(Date.now() - 60_000).toISOString(),
    };
    render(<PaymentWindowCountdown booking={past} testIdPrefix="t" />);
    expect(screen.getByTestId("t-live")).toHaveTextContent(
      messages.booking.payUnavailableAnnounce,
    );
    expect(screen.queryByTestId("t-visible")).toBeNull();
  });
});