import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";

const { listMock, getMock, approveMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  getMock: vi.fn(),
  approveMock: vi.fn(),
}));

vi.mock("./adminBookingsApi.js", () => ({
  listAdminBookings: (...args) => listMock(...args),
  getAdminBooking: (...args) => getMock(...args),
  approveAdminBooking: (...args) => approveMock(...args),
}));

import { AdminBookingDetailPage } from "./AdminBookingDetailPage.jsx";
import { AdminBookingsPage } from "./AdminBookingsPage.jsx";

const PENDING = {
  id: "b-1",
  reference: "ABCDEF123456",
  status: "PENDING",
  package_id: "p-1",
  package_title: "Cox's Bazar Escape",
  available_date_id: "d-1",
  tour_date: "2099-06-15",
  travelers: 2,
  contact_name: "Contact Person",
  contact_email: "contact@example.com",
  contact_phone: "+8801700000000",
  additional_requirements: "Vegetarian meals",
  payment_status: "UNPAID",
  payment_window_status: "NOT_OPEN",
  created_at: "2099-01-01T06:00:00Z",
  customer_full_name: "Casey Customer",
  customer_email: "casey@example.com",
};

const APPROVED = {
  ...PENDING,
  id: "b-2",
  reference: "FEDCBA654321",
  status: "APPROVED",
  package_title: "Sylhet Retreat",
  payment_window_status: "OPEN",
};

function page(results, extra = {}) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
    ...extra,
  };
}

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
        <Route path="/app/admin/bookings" element={<AdminBookingsPage />} />
        <Route path="/app/admin/bookings/:id" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  getMock.mockReset();
  approveMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("AdminBookingsPage", () => {
  it("loads with no status filter (All) and shows separate status chips, customer, and no decision controls", async () => {
    listMock.mockResolvedValue(page([PENDING, APPROVED]));
    renderRoutes("/app/admin/bookings");

    const list = await screen.findByTestId("admin-bookings-list");
    expect(listMock).toHaveBeenCalledWith({ page: 1, status: "" });
    expect(screen.getByTestId("admin-bookings-status-filter")).toHaveValue("");
    expect(within(list).getAllByTestId(/^admin-booking-card-/)).toHaveLength(2);
    expect(screen.getByTestId("admin-booking-reference-b-1")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(screen.getByTestId("admin-booking-customer-b-1")).toHaveTextContent(
      "Casey Customer",
    );
    expect(screen.getByTestId("admin-booking-card-b-1")).toHaveTextContent(
      "2099-06-15",
    );
    expect(screen.getByTestId("admin-booking-b-1-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.PENDING,
    );
    expect(screen.getByTestId("admin-booking-b-1-payment-status")).toHaveTextContent(
      messages.booking.paymentStatus.UNPAID,
    );
    expect(screen.getByTestId("admin-booking-b-1-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
    expect(screen.getByTestId("admin-booking-b-2-window-status")).toHaveTextContent(
      messages.booking.windowStatus.OPEN,
    );
    expect(screen.queryByRole("button", { name: /approve|reject|pay|cancel/i })).toBeNull();
    expect(screen.getByTestId("admin-booking-card-b-1")).toHaveAttribute(
      "href",
      "/app/admin/bookings/b-1",
    );
  });

  it("filters by PENDING via the server and resets to page 1", async () => {
    listMock.mockResolvedValueOnce(page([PENDING, APPROVED]));
    listMock.mockResolvedValue(page([PENDING]));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");

    await user.selectOptions(screen.getByTestId("admin-bookings-status-filter"), "PENDING");

    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ page: 1, status: "PENDING" }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId("admin-bookings-list")).getAllByTestId(
          /^admin-booking-card-/,
        ),
      ).toHaveLength(1),
    );
    expect(screen.queryByTestId("admin-booking-card-b-2")).toBeNull();
  });

  it("changing the filter after Next restarts at page 1", async () => {
    listMock.mockResolvedValueOnce(
      page([PENDING], { count: 21, next: "http://x/?page=2" }),
    );
    listMock.mockResolvedValueOnce(
      page([APPROVED], { count: 21, previous: "http://x/" }),
    );
    listMock.mockResolvedValue(page([PENDING]));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");

    await user.click(screen.getByTestId("admin-bookings-next"));
    await screen.findByTestId("admin-booking-card-b-2");
    expect(listMock).toHaveBeenLastCalledWith({ page: 2, status: "" });

    await user.selectOptions(screen.getByTestId("admin-bookings-status-filter"), "PENDING");
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ page: 1, status: "PENDING" }),
    );
  });

  it("Retry after a failed Next repeats the requested page, not the last good one", async () => {
    listMock.mockResolvedValueOnce(
      page([PENDING], { count: 21, next: "http://x/?page=2" }),
    );
    listMock.mockRejectedValueOnce(apiError(500));
    listMock.mockResolvedValue(page([APPROVED], { count: 21, previous: "x" }));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");

    await user.click(screen.getByTestId("admin-bookings-next"));
    await screen.findByRole("alert");
    await user.click(screen.getByTestId("admin-bookings-retry"));

    expect(await screen.findByTestId("admin-booking-card-b-2")).toBeInTheDocument();
    expect(listMock).toHaveBeenLastCalledWith({ page: 2, status: "" });
  });

  it("falls back to page 1 when a later page 404s (invalid page)", async () => {
    listMock.mockResolvedValueOnce(
      page([PENDING], { count: 21, next: "http://x/?page=2" }),
    );
    listMock.mockRejectedValueOnce(apiError(404));
    listMock.mockResolvedValue(page([PENDING]));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");

    await user.click(screen.getByTestId("admin-bookings-next"));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ page: 1, status: "" }),
    );
    expect(await screen.findByTestId("admin-booking-card-b-1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows only the email when the customer name is empty", async () => {
    listMock.mockResolvedValue(page([{ ...PENDING, customer_full_name: "" }]));
    renderRoutes("/app/admin/bookings");
    const line = await screen.findByTestId("admin-booking-customer-b-1");
    expect(line).toHaveTextContent("casey@example.com");
    expect(line.textContent).not.toMatch(/\(|\)/);
  });

  it("shows the empty state when there are no bookings", async () => {
    listMock.mockResolvedValue(page([]));
    renderRoutes("/app/admin/bookings");
    const empty = await screen.findByTestId("admin-bookings-empty");
    expect(empty).toHaveTextContent(messages.adminBookings.emptyTitle);
    expect(screen.queryByTestId("admin-bookings-clear-filters")).toBeNull();
  });

  it("shows a filter-empty state with a clear action", async () => {
    listMock.mockResolvedValueOnce(page([PENDING]));
    listMock.mockResolvedValueOnce(page([]));
    listMock.mockResolvedValue(page([PENDING]));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");

    await user.selectOptions(screen.getByTestId("admin-bookings-status-filter"), "REJECTED");
    const empty = await screen.findByTestId("admin-bookings-empty");
    expect(empty).toHaveTextContent(messages.adminBookings.filterEmptyTitle);

    await user.click(screen.getByTestId("admin-bookings-clear-filters"));
    await screen.findByTestId("admin-bookings-list");
    expect(listMock).toHaveBeenLastCalledWith({ page: 1, status: "" });
    expect(screen.getByTestId("admin-bookings-status-filter")).toHaveValue("");
  });

  it("shows a role=alert error with Retry that recovers", async () => {
    listMock.mockRejectedValueOnce(apiError(500));
    listMock.mockResolvedValue(page([PENDING]));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(messages.adminBookings.errors.listGeneric);
    await user.click(screen.getByTestId("admin-bookings-retry"));
    expect(await screen.findByTestId("admin-bookings-list")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("paginates with next/previous keeping the current filter", async () => {
    listMock.mockResolvedValueOnce(
      page([PENDING], { count: 21, next: "http://x/?page=2" }),
    );
    listMock.mockResolvedValueOnce(
      page([APPROVED], { count: 21, previous: "http://x/" }),
    );
    listMock.mockResolvedValue(page([PENDING], { count: 21, next: "x" }));
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings");
    await screen.findByTestId("admin-bookings-list");
    expect(screen.getByTestId("admin-bookings-prev")).toBeDisabled();

    await user.click(screen.getByTestId("admin-bookings-next"));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ page: 2, status: "" }),
    );
    expect(await screen.findByTestId("admin-booking-card-b-2")).toBeInTheDocument();
    expect(screen.getByTestId("admin-bookings-next")).toBeDisabled();

    await user.click(screen.getByTestId("admin-bookings-prev"));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith({ page: 1, status: "" }),
    );
  });
});

describe("AdminBookingDetailPage", () => {
  it("renders required fields, account + contact identity, and three separate statuses", async () => {
    getMock.mockResolvedValue(PENDING);
    renderRoutes("/app/admin/bookings/b-1");

    expect(await screen.findByTestId("admin-booking-detail-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(getMock).toHaveBeenCalledWith("b-1");
    expect(screen.getByTestId("admin-booking-detail-package")).toHaveTextContent(
      "Cox's Bazar Escape",
    );
    expect(screen.getByTestId("admin-booking-detail-tour-date")).toHaveTextContent(
      "2099-06-15",
    );
    expect(screen.getByTestId("admin-booking-detail-travelers")).toHaveTextContent("2");
    expect(screen.getByTestId("admin-booking-detail-requirements")).toHaveTextContent(
      "Vegetarian meals",
    );
    expect(screen.getByTestId("admin-booking-detail-submitted")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("admin-booking-detail-customer-name")).toHaveTextContent(
      "Casey Customer",
    );
    expect(screen.getByTestId("admin-booking-detail-customer-email")).toHaveTextContent(
      "casey@example.com",
    );
    expect(screen.getByTestId("admin-booking-detail-contact-name")).toHaveTextContent(
      "Contact Person",
    );
    expect(screen.getByTestId("admin-booking-detail-contact-email")).toHaveTextContent(
      "contact@example.com",
    );
    expect(screen.getByTestId("admin-booking-detail-contact-phone")).toHaveTextContent(
      "+8801700000000",
    );

    expect(screen.getByTestId("admin-booking-detail-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.PENDING,
    );
    expect(screen.getByTestId("admin-booking-detail-payment-status")).toHaveTextContent(
      messages.booking.paymentStatus.UNPAID,
    );
    expect(screen.getByTestId("admin-booking-detail-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
  });

  it("shows a placeholder for blank customer/contact fields", async () => {
    getMock.mockResolvedValue({
      ...PENDING,
      customer_full_name: "",
      contact_phone: "",
    });
    renderRoutes("/app/admin/bookings/b-1");
    expect(await screen.findByTestId("admin-booking-detail-customer-name")).toHaveTextContent(
      messages.booking.statusNotAvailable,
    );
    expect(screen.getByTestId("admin-booking-detail-contact-phone")).toHaveTextContent(
      messages.booking.statusNotAvailable,
    );
  });

  it("does not flash the previous booking when the id changes", async () => {
    let resolveSecond;
    getMock.mockResolvedValueOnce(PENDING);
    getMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSecond = resolve; }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/app/admin/bookings/b-1"]}>
        <Routes>
          <Route
            path="/app/admin/bookings/:id"
            element={<AdminBookingDetailPage />}
          />
        </Routes>
        <Link to="/app/admin/bookings/b-2" data-testid="go-b2">go</Link>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("admin-booking-detail-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    await user.click(screen.getByTestId("go-b2"));
    await waitFor(() =>
      expect(screen.queryByTestId("admin-booking-detail-reference")).toBeNull(),
    );
    resolveSecond({ ...APPROVED });
    expect(await screen.findByTestId("admin-booking-detail-reference")).toHaveTextContent(
      "FEDCBA654321",
    );
  });

  it("offers only Approve on a PENDING booking (no reject / window / Pay / Cancel)", async () => {
    getMock.mockResolvedValue(PENDING);
    renderRoutes("/app/admin/bookings/b-1");
    await screen.findByTestId("admin-booking-detail-reference");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("data-testid", "admin-booking-approve-button");
    expect(buttons[0]).toHaveTextContent(messages.adminBookings.approveBooking);
    expect(screen.queryByTestId("booking-cancel-button")).toBeNull();
    expect(screen.queryByText(/pay now|reject|reopen|extend/i)).toBeNull();
  });

  it.each(["APPROVED", "REJECTED", "CANCELLED"])(
    "hides Approve when the booking is %s",
    async (status) => {
      getMock.mockResolvedValue({ ...PENDING, status });
      renderRoutes("/app/admin/bookings/b-1");
      await screen.findByTestId("admin-booking-detail-reference");
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByTestId("admin-booking-approve-button")).toBeNull();
    },
  );

  describe("approve", () => {
    async function openConfirm(user) {
      renderRoutes("/app/admin/bookings/b-1");
      await user.click(await screen.findByTestId("admin-booking-approve-button"));
      return screen.findByRole("dialog");
    }

    it("confirm dialog states the 24h window starts on approve, with no computed deadline", async () => {
      getMock.mockResolvedValue(PENDING);
      const user = userEvent.setup();
      const dialog = await openConfirm(user);

      expect(dialog).toHaveTextContent(messages.adminBookings.approveDialogTitle);
      expect(dialog).toHaveTextContent("24-hour payment window");
      expect(dialog).toHaveTextContent("ABCDEF123456");
      expect(dialog.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
      expect(approveMock).not.toHaveBeenCalled();
    });

    it("cancelling the dialog does not approve and keeps Approve available", async () => {
      getMock.mockResolvedValue(PENDING);
      const user = userEvent.setup();
      await openConfirm(user);

      await user.click(
        screen.getByRole("button", { name: messages.adminBookings.approveDialogKeep }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(approveMock).not.toHaveBeenCalled();
      expect(screen.getByTestId("admin-booking-approve-button")).toBeInTheDocument();
    });

    it("Esc closes the dialog without approving", async () => {
      getMock.mockResolvedValue(PENDING);
      const user = userEvent.setup();
      await openConfirm(user);
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(approveMock).not.toHaveBeenCalled();
    });

    it("on success stays on detail, refreshes statuses, shows role=status, and hides Approve", async () => {
      getMock.mockResolvedValue(PENDING);
      approveMock.mockResolvedValue({
        ...PENDING,
        status: "APPROVED",
        payment_window_status: "OPEN",
      });
      const user = userEvent.setup();
      await openConfirm(user);

      await user.click(
        screen.getByRole("button", { name: messages.adminBookings.approveDialogConfirm }),
      );

      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("ABCDEF123456");
      expect(status).toHaveTextContent("24-hour payment window is now open");
      expect(approveMock).toHaveBeenCalledTimes(1);
      expect(approveMock).toHaveBeenCalledWith("b-1");
      expect(screen.getByTestId("admin-booking-detail-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.APPROVED,
      );
      expect(screen.getByTestId("admin-booking-detail-payment-status")).toHaveTextContent(
        messages.booking.paymentStatus.UNPAID,
      );
      expect(screen.getByTestId("admin-booking-detail-window-status")).toHaveTextContent(
        messages.booking.windowStatus.OPEN,
      );
      expect(screen.queryByTestId("admin-booking-approve-button")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByTestId("admin-booking-detail-page")).toBeInTheDocument();
    });

    it("shows the server reason in a role=alert when the 7-day rule blocks approval", async () => {
      getMock.mockResolvedValue(PENDING);
      approveMock.mockRejectedValue(
        apiError(400, "Travel date must be on or after 2099-01-08 (7 calendar days ahead)."),
      );
      const user = userEvent.setup();
      await openConfirm(user);

      await user.click(
        screen.getByRole("button", { name: messages.adminBookings.approveDialogConfirm }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("This booking cannot be approved.");
      expect(alert).toHaveTextContent("7 calendar days ahead");
      // Nothing changed: still PENDING with Approve available, no success message.
      expect(screen.getByTestId("admin-booking-approve-button")).toBeInTheDocument();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.getByTestId("admin-booking-detail-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.PENDING,
      );
    });

    it("409 shows not-pending alert and refreshes the booking (Approve disappears)", async () => {
      getMock.mockResolvedValueOnce(PENDING);
      getMock.mockResolvedValue({ ...PENDING, status: "CANCELLED" });
      approveMock.mockRejectedValue(apiError(409, "Only pending bookings can be approved."));
      const user = userEvent.setup();
      await openConfirm(user);

      await user.click(
        screen.getByRole("button", { name: messages.adminBookings.approveDialogConfirm }),
      );

      expect(await screen.findByTestId("admin-booking-approve-error")).toHaveTextContent(
        messages.adminBookings.errors.approveNotPending,
      );
      await waitFor(() =>
        expect(screen.queryByTestId("admin-booking-approve-button")).toBeNull(),
      );
      expect(getMock).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("admin-booking-detail-booking-status")).toHaveTextContent(
        messages.booking.bookingStatus.CANCELLED,
      );
    });

    it("5xx reports an unknown outcome and reloads live state", async () => {
      getMock.mockResolvedValueOnce(PENDING);
      getMock.mockResolvedValue({
        ...PENDING,
        status: "APPROVED",
        payment_window_status: "OPEN",
      });
      approveMock.mockRejectedValue(apiError(500));
      const user = userEvent.setup();
      await openConfirm(user);

      await user.click(
        screen.getByRole("button", { name: messages.adminBookings.approveDialogConfirm }),
      );

      expect(await screen.findByTestId("admin-booking-approve-error")).toHaveTextContent(
        messages.adminBookings.errors.approveOutcomeUnknown,
      );
      await waitFor(() =>
        expect(screen.queryByTestId("admin-booking-approve-button")).toBeNull(),
      );
      expect(screen.getByTestId("admin-booking-detail-window-status")).toHaveTextContent(
        messages.booking.windowStatus.OPEN,
      );
    });

    it("a double-clicked confirm sends a single approve request", async () => {
      getMock.mockResolvedValue(PENDING);
      let resolveApprove;
      approveMock.mockImplementation(
        () => new Promise((resolve) => { resolveApprove = resolve; }),
      );
      const user = userEvent.setup();
      await openConfirm(user);
      const confirm = screen.getByRole("button", {
        name: messages.adminBookings.approveDialogConfirm,
      });

      await user.dblClick(confirm);
      resolveApprove({ ...PENDING, status: "APPROVED", payment_window_status: "OPEN" });

      await screen.findByRole("status");
      expect(approveMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a not-found state for 404", async () => {
    getMock.mockRejectedValue(apiError(404));
    renderRoutes("/app/admin/bookings/missing");
    expect(await screen.findByTestId("admin-booking-detail-not-found")).toBeInTheDocument();
  });

  it("shows role=alert error with Retry for other failures", async () => {
    getMock.mockRejectedValueOnce(apiError(500));
    getMock.mockResolvedValue(PENDING);
    const user = userEvent.setup();
    renderRoutes("/app/admin/bookings/b-1");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(messages.adminBookings.errors.detailGeneric);
    await user.click(screen.getByTestId("admin-booking-detail-retry"));
    expect(await screen.findByTestId("admin-booking-detail-reference")).toBeInTheDocument();
  });
});
