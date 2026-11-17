import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";

const { listMock, getMock, cancelMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  getMock: vi.fn(),
  cancelMock: vi.fn(),
}));

vi.mock("./bookingsApi.js", () => ({
  listMyBookings: (...args) => listMock(...args),
  getBooking: (...args) => getMock(...args),
  cancelBooking: (...args) => cancelMock(...args),
}));

import { BookingDetailPage } from "./BookingDetailPage.jsx";
import { MyBookingsPage } from "./MyBookingsPage.jsx";

const PENDING = {
  id: "b-1",
  reference: "ABCDEF123456",
  status: "PENDING",
  package_id: "p-1",
  package_title: "Cox's Bazar Escape",
  available_date_id: "d-1",
  tour_date: "2099-06-15",
  travelers: 2,
  contact_name: "Casey Customer",
  contact_email: "casey@example.com",
  contact_phone: "+8801700000000",
  additional_requirements: "Vegetarian meals",
  payment_status: "UNPAID",
  payment_window_status: "NOT_OPEN",
  created_at: "2099-01-01T06:00:00Z",
};

const APPROVED = {
  ...PENDING,
  id: "b-2",
  reference: "FEDCBA654321",
  status: "APPROVED",
  package_title: "Sylhet Retreat",
};

function apiError(status, message = "x") {
  return new ApiError({
    status,
    fieldErrors: {},
    nonFieldErrors: [message],
    raw: null,
  });
}

function renderRoutes(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/customer/bookings" element={<MyBookingsPage />} />
        <Route path="/app/customer/bookings/:id" element={<BookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  getMock.mockReset();
  cancelMock.mockReset();
});

describe("MyBookingsPage", () => {
  it("lists own bookings with separate status chips and no Pay action", async () => {
    listMock.mockResolvedValue([PENDING, APPROVED]);
    renderRoutes("/app/customer/bookings");

    const list = await screen.findByTestId("my-bookings-list");
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("my-booking-reference-b-1")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(screen.getByText("Cox's Bazar Escape")).toBeInTheDocument();
    expect(screen.getByTestId("my-booking-card-b-1")).toHaveTextContent("2099-06-15");

    expect(screen.getByTestId("my-booking-b-1-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.PENDING,
    );
    expect(screen.getByTestId("my-booking-b-1-payment-status")).toHaveTextContent(
      messages.booking.paymentStatus.UNPAID,
    );
    expect(screen.getByTestId("my-booking-b-1-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
    expect(screen.getByTestId("my-booking-b-2-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.APPROVED,
    );
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("my-booking-card-b-1")).toHaveAttribute(
      "href",
      "/app/customer/bookings/b-1",
    );
  });

  it("shows the empty state when there are no bookings", async () => {
    listMock.mockResolvedValue([]);
    renderRoutes("/app/customer/bookings");
    expect(await screen.findByTestId("my-bookings-empty")).toBeInTheDocument();
  });

  it("shows an alert with Retry on load failure", async () => {
    const user = userEvent.setup();
    listMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    listMock.mockResolvedValueOnce([PENDING]);
    renderRoutes("/app/customer/bookings");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.booking.historyErrors.listGeneric,
    );
    await user.click(screen.getByTestId("my-bookings-retry"));
    expect(await screen.findByTestId("my-bookings-list")).toBeInTheDocument();
  });
});

describe("BookingDetailPage", () => {
  it("shows full detail with three separate statuses and Cancel for PENDING; Pay hidden", async () => {
    getMock.mockResolvedValue(PENDING);
    renderRoutes("/app/customer/bookings/b-1");

    expect(await screen.findByTestId("booking-detail-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(getMock).toHaveBeenCalledWith("b-1");
    expect(screen.getByTestId("booking-detail-package")).toHaveTextContent(
      "Cox's Bazar Escape",
    );
    expect(screen.getByTestId("booking-detail-tour-date")).toHaveTextContent(
      "2099-06-15",
    );
    expect(screen.getByTestId("booking-detail-travelers")).toHaveTextContent("2");
    expect(screen.getByTestId("booking-detail-submitted")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("booking-detail-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.PENDING,
    );
    expect(screen.getByTestId("booking-detail-payment-status")).toHaveTextContent(
      messages.booking.paymentStatus.UNPAID,
    );
    expect(screen.getByTestId("booking-detail-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
    expect(screen.getByTestId("booking-cancel-button")).toBeInTheDocument();
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument();
  });

  it.each(["APPROVED", "REJECTED", "CANCELLED"])(
    "hides Cancel when booking is %s",
    async (status) => {
      getMock.mockResolvedValue({ ...PENDING, status });
      renderRoutes("/app/customer/bookings/b-1");
      await screen.findByTestId("booking-detail-reference");
      expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
    },
  );

  it("shows the rejection reason on a REJECTED booking, with no Cancel or Pay", async () => {
    getMock.mockResolvedValue({
      ...PENDING,
      status: "REJECTED",
      rejection_reason: "No capacity on that date.",
    });
    renderRoutes("/app/customer/bookings/b-1");
    expect(await screen.findByTestId("booking-detail-rejection-reason")).toHaveTextContent(
      "No capacity on that date.",
    );
    expect(screen.getByTestId("booking-detail-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.REJECTED,
    );
    expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each(["PENDING", "APPROVED", "CANCELLED"])(
    "does not show a rejection reason row when the booking is %s",
    async (status) => {
      getMock.mockResolvedValue({ ...PENDING, status, rejection_reason: "" });
      renderRoutes("/app/customer/bookings/b-1");
      await screen.findByTestId("booking-detail-reference");
      expect(screen.queryByTestId("booking-detail-rejection-reason")).toBeNull();
    },
  );

  it("shows not-found for another customer's / missing booking (404)", async () => {
    getMock.mockRejectedValue(apiError(404, "Not found."));
    renderRoutes("/app/customer/bookings/other");
    expect(await screen.findByTestId("booking-detail-not-found")).toBeInTheDocument();
    expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
  });

  it("shows load error with Retry for non-404 failures", async () => {
    const user = userEvent.setup();
    getMock.mockRejectedValueOnce(apiError(500));
    getMock.mockResolvedValueOnce(PENDING);
    renderRoutes("/app/customer/bookings/b-1");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.booking.historyErrors.detailGeneric,
    );
    await user.click(screen.getByTestId("booking-detail-retry"));
    expect(await screen.findByTestId("booking-detail-reference")).toBeInTheDocument();
  });

  it("opens an alertdialog, keep leaves booking untouched and no API call", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(PENDING);
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleName(messages.booking.cancelDialogTitle);
    await user.click(
      within(dialog).getByRole("button", { name: messages.booking.cancelDialogKeep }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("booking-cancel-button")).toBeInTheDocument();
  });

  it("closes the dialog on Escape without cancelling", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(PENDING);
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(cancelMock).not.toHaveBeenCalled();
  });

  it("confirm cancels via API, shows CANCELLED + status toast, and removes Cancel", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(PENDING);
    cancelMock.mockResolvedValue({ ...PENDING, status: "CANCELLED" });
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: messages.booking.cancelDialogConfirm,
      }),
    );

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("b-1"));
    expect(await screen.findByTestId("booking-cancel-success")).toHaveAttribute(
      "role",
      "status",
    );
    expect(screen.getByTestId("booking-detail-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.CANCELLED,
    );
    expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows an alert and refreshes when cancel is rejected as not pending (409)", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValueOnce(PENDING);
    getMock.mockResolvedValueOnce({ ...PENDING, status: "APPROVED" });
    cancelMock.mockRejectedValue(apiError(409, "Only pending bookings can be cancelled."));
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: messages.booking.cancelDialogConfirm,
      }),
    );

    expect(await screen.findByTestId("booking-cancel-error")).toHaveAttribute(
      "role",
      "alert",
    );
    await waitFor(() =>
      expect(screen.getByTestId("booking-detail-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.APPROVED,
      ),
    );
    expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
  });

  it("uses outcome-unknown copy and reloads the booking on network failure", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValueOnce(PENDING);
    getMock.mockResolvedValueOnce({ ...PENDING, status: "CANCELLED" });
    cancelMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: messages.booking.cancelDialogConfirm,
      }),
    );
    expect(await screen.findByTestId("booking-cancel-error")).toHaveTextContent(
      messages.booking.historyErrors.cancelOutcomeUnknown,
    );
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("booking-detail-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.CANCELLED,
      ),
    );
    expect(screen.queryByTestId("booking-cancel-button")).not.toBeInTheDocument();
  });

  it("resets cancel UI state when the :id changes", async () => {
    const user = userEvent.setup();
    getMock.mockImplementation((id) =>
      Promise.resolve({ ...PENDING, id, reference: id === "b-1" ? "REF1" : "REF2" }),
    );
    cancelMock.mockResolvedValue({ ...PENDING, status: "CANCELLED", reference: "REF1" });
    function GoTo() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/app/customer/bookings/b-2")}>
          go-b2
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={["/app/customer/bookings/b-1"]}>
        <GoTo />
        <Routes>
          <Route path="/app/customer/bookings/:id" element={<BookingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByTestId("booking-cancel-button"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: messages.booking.cancelDialogConfirm,
      }),
    );
    expect(await screen.findByTestId("booking-cancel-success")).toBeInTheDocument();

    await user.click(screen.getByText("go-b2"));
    await waitFor(() =>
      expect(screen.getByTestId("booking-detail-reference")).toHaveTextContent("REF2"),
    );
    expect(screen.queryByTestId("booking-cancel-success")).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-cancel-error")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a generic alert and keeps Cancel available on a 4xx cancel failure", async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(PENDING);
    cancelMock.mockRejectedValue(apiError(400));
    renderRoutes("/app/customer/bookings/b-1");
    await user.click(await screen.findByTestId("booking-cancel-button"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: messages.booking.cancelDialogConfirm,
      }),
    );
    expect(await screen.findByTestId("booking-cancel-error")).toHaveTextContent(
      messages.booking.historyErrors.cancelGeneric,
    );
    expect(screen.getByTestId("booking-cancel-button")).toBeInTheDocument();
  });
});
