import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";

const { getBookingMock } = vi.hoisted(() => ({ getBookingMock: vi.fn() }));

vi.mock("./bookingsApi.js", () => ({
  getBooking: (...args) => getBookingMock(...args),
}));

import { BookingConfirmationPage } from "./BookingConfirmationPage.jsx";

const BOOKING = {
  id: "b-1",
  reference: "ABCDEF123456",
  status: "PENDING",
  payment_status: "UNPAID",
  payment_window_status: "NOT_OPEN",
  package_title: "Cox's Bazar Escape",
};

function renderPage(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BookingConfirmationPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getBookingMock.mockReset();
  getBookingMock.mockResolvedValue(BOOKING);
});

describe("BookingConfirmationPage", () => {
  it("fetches the live booking by id and shows reference + separate statuses, Pay hidden", async () => {
    renderPage(
      "/app/bookings/confirmation?booking=b-1&reference=ABCDEF123456&status=APPROVED",
    );
    expect(await screen.findByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(getBookingMock).toHaveBeenCalledWith("b-1");
    expect(screen.getByTestId("booking-confirmation-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.PENDING,
    );
    expect(screen.getByTestId("booking-confirmation-payment-status")).toHaveTextContent(
      messages.booking.paymentStatus.UNPAID,
    );
    expect(screen.getByTestId("booking-confirmation-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
    expect(screen.getByTestId("booking-confirmation-window-note")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: messages.booking.confirmationTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("pay-now")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-confirmation-detail")).toHaveAttribute(
      "href",
      "/app/customer/bookings/b-1",
    );
    expect(screen.getByTestId("booking-confirmation-history")).toHaveAttribute(
      "href",
      "/app/customer/bookings",
    );
  });

  it("does not trust the status query param — shows the fetched status", async () => {
    getBookingMock.mockResolvedValue({ ...BOOKING, status: "CANCELLED" });
    renderPage("/app/bookings/confirmation?booking=b-1&status=PENDING");
    await waitFor(() =>
      expect(screen.getByTestId("booking-confirmation-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.CANCELLED,
      ),
    );
  });

  it("shows a load error with Retry that refetches", async () => {
    const user = userEvent.setup();
    getBookingMock.mockRejectedValueOnce(
      new ApiError({ status: 500, fieldErrors: {}, nonFieldErrors: ["boom"], raw: null }),
    );
    renderPage("/app/bookings/confirmation?booking=b-1");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(messages.booking.historyErrors.detailGeneric);
    await user.click(screen.getByTestId("booking-confirmation-retry"));
    expect(await screen.findByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(getBookingMock).toHaveBeenCalledTimes(2);
  });

  it("shows not-found body without Retry on 404, keeping the reference fallback", async () => {
    getBookingMock.mockRejectedValue(
      new ApiError({ status: 404, fieldErrors: {}, nonFieldErrors: ["Not found."], raw: null }),
    );
    renderPage("/app/bookings/confirmation?booking=b-1&reference=ABCDEF123456");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.booking.detailNotFoundBody,
    );
    expect(screen.queryByTestId("booking-confirmation-retry")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
  });

  it("keeps the reference visible on a transient load error", async () => {
    getBookingMock.mockRejectedValue(
      new ApiError({ status: 500, fieldErrors: {}, nonFieldErrors: ["boom"], raw: null }),
    );
    renderPage("/app/bookings/confirmation?booking=b-1&reference=ABCDEF123456");
    await screen.findByTestId("booking-confirmation-retry");
    expect(screen.getByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
  });

  it.each(["CANCELLED", "REJECTED"])(
    "hides the NOT_OPEN window note when booking is %s",
    async (status) => {
      getBookingMock.mockResolvedValue({ ...BOOKING, status });
      renderPage("/app/bookings/confirmation?booking=b-1");
      await screen.findByTestId("booking-confirmation-reference");
      expect(
        screen.queryByTestId("booking-confirmation-window-note"),
      ).not.toBeInTheDocument();
    },
  );

  it("soft-recovers when only a reference is present (no fetch)", () => {
    renderPage("/app/bookings/confirmation?reference=ABCDEF123456");
    expect(getBookingMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("booking-confirmation-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(screen.getByTestId("booking-confirmation-missing")).toHaveTextContent(
      messages.booking.confirmationReferenceOnly,
    );
    expect(screen.getByTestId("booking-confirmation-history")).toBeInTheDocument();
  });

  it("soft-recovers when neither id nor reference is present", () => {
    renderPage("/app/bookings/confirmation");
    expect(getBookingMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("booking-confirmation-missing")).toHaveTextContent(
      messages.booking.confirmationMissing,
    );
  });
});
