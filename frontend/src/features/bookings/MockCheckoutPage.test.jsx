import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";

const { getMock, attemptMock, navigateMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  attemptMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("./bookingsApi.js", () => ({
  getBooking: (...args) => getMock(...args),
  submitPaymentAttempt: (...args) => attemptMock(...args),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { MockCheckoutPage } from "./MockCheckoutPage.jsx";

const ELIGIBLE = {
  id: "b-2",
  reference: "PAYME1234567",
  status: "APPROVED",
  package_title: "Tour",
  payment_status: "UNPAID",
  payment_window_status: "OPEN",
  payment_eligible: true,
  payment_window_deadline_at: "2099-12-01T06:00:00Z",
  tour_date: "2099-06-15",
  travelers: 2,
};

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={["/app/customer/bookings/b-2/pay"]}>
      <Routes>
        <Route path="/app/customer/bookings/:id/pay" element={<MockCheckoutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  attemptMock.mockReset();
  navigateMock.mockReset();
  getMock.mockResolvedValue(ELIGIBLE);
});

afterEach(() => {
  cleanup();
});

describe("MockCheckoutPage (Story 7.2)", () => {
  it("shows mock legend and simulate buttons when eligible", async () => {
    renderCheckout();
    expect(await screen.findByTestId("mock-checkout-legend")).toHaveTextContent(
      messages.booking.checkoutMockLegend,
    );
    expect(screen.getByTestId("mock-checkout-simulate-success")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("navigates to detail after simulate SUCCESS", async () => {
    const user = userEvent.setup();
    attemptMock.mockResolvedValue({ status: "SUCCESS" });
    renderCheckout();
    await user.click(await screen.findByTestId("mock-checkout-simulate-success"));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/app/customer/bookings/b-2", {
        replace: true,
        state: { paySuccessReference: "PAYME1234567" },
      }),
    );
  });

  it("blocks checkout UI when not eligible", async () => {
    getMock.mockResolvedValue({ ...ELIGIBLE, payment_eligible: false });
    renderCheckout();
    expect(await screen.findByTestId("mock-checkout-ineligible")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-checkout-simulate-success")).toBeNull();
  });

  it("retry after FAILED: second attempt SUCCESS navigates to detail", async () => {
    const user = userEvent.setup();
    attemptMock
      .mockResolvedValueOnce({ status: "FAILED" })
      .mockResolvedValueOnce({ status: "SUCCESS" });
    getMock
      .mockResolvedValueOnce(ELIGIBLE)
      .mockResolvedValueOnce({ ...ELIGIBLE, payment_status: "FAILED" })
      .mockResolvedValueOnce({ ...ELIGIBLE, payment_status: "FAILED" });
    renderCheckout();
    await user.click(await screen.findByTestId("mock-checkout-simulate-failed"));
    await user.click(await screen.findByTestId("mock-checkout-simulate-success"));
    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    expect(attemptMock).toHaveBeenCalledTimes(2);
  });

  it("disables simulate buttons when offline", async () => {
    const onlineDesc = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    renderCheckout();
    const btn = await screen.findByTestId("mock-checkout-simulate-success");
    expect(btn).toBeDisabled();
    expect(screen.getByTestId("mock-checkout-offline-banner")).toBeInTheDocument();
    if (onlineDesc) {
      Object.defineProperty(navigator, "onLine", onlineDesc);
    }
  });
});