import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";

const { getMock, reopenMock, extendMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  reopenMock: vi.fn(),
  extendMock: vi.fn(),
}));

vi.mock("./adminBookingsApi.js", () => ({
  listAdminBookings: vi.fn(),
  getAdminBooking: (...args) => getMock(...args),
  approveAdminBooking: vi.fn(),
  rejectAdminBooking: vi.fn(),
  reopenAdminPaymentWindow: (...args) => reopenMock(...args),
  extendAdminPaymentWindow: (...args) => extendMock(...args),
}));

import { AdminBookingDetailPage } from "./AdminBookingDetailPage.jsx";

const EXPIRED_APPROVED = {
  id: "b-1",
  reference: "ABCDEF123456",
  status: "APPROVED",
  package_id: "p-1",
  package_title: "Cox's Bazar Escape",
  available_date_id: "d-1",
  tour_date: "2099-06-15",
  travelers: 2,
  contact_name: "Contact Person",
  contact_email: "contact@example.com",
  contact_phone: "+8801700000000",
  additional_requirements: "",
  payment_status: "UNPAID",
  payment_window_status: "EXPIRED",
  payment_window_deadline_at: "2099-01-01T06:00:00Z",
  payment_eligible: false,
  created_at: "2099-01-01T06:00:00Z",
  customer_full_name: "Casey Customer",
  customer_email: "casey@example.com",
  rejection_reason: "",
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/app/admin/bookings/b-1"]}>
      <Routes>
        <Route path="/app/admin/bookings/:id" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  reopenMock.mockReset();
  extendMock.mockReset();
  getMock.mockResolvedValue(EXPIRED_APPROVED);
});

afterEach(() => {
  cleanup();
});

describe("AdminBookingDetailPage reopen/extend (Story 6.4)", () => {
  it("shows reopen + extend on APPROVED + EXPIRED and eligibility callout", async () => {
    renderDetail();
    expect(await screen.findByTestId("admin-booking-reopen-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-booking-extend-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-booking-detail-payment-eligible")).toHaveTextContent(
      messages.adminBookings.paymentEligibleNo,
    );
  });

  it("reopens window and stays on detail with success status", async () => {
    const user = userEvent.setup();
    reopenMock.mockResolvedValue({
      ...EXPIRED_APPROVED,
      payment_window_status: "OPEN",
    });
    renderDetail();
    await user.click(await screen.findByTestId("admin-booking-reopen-button"));
    await user.click(
      screen.getByRole("button", { name: messages.adminBookings.reopenDialogConfirm }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("admin-booking-reopen-success")).toBeInTheDocument(),
    );
    expect(reopenMock).toHaveBeenCalledWith("b-1");
  });

  it("extends deadline with datetime-local → ISO", async () => {
    const user = userEvent.setup();
    extendMock.mockResolvedValue({
      ...EXPIRED_APPROVED,
      payment_window_status: "OPEN",
      payment_eligible: true,
      payment_window_deadline_at: "2099-12-01T06:00:00Z",
    });
    renderDetail();
    await user.click(await screen.findByTestId("admin-booking-extend-button"));
    await user.type(
      await screen.findByTestId("admin-booking-extend-deadline"),
      "2099-12-01T10:30",
    );
    await user.click(
      screen.getByRole("button", { name: messages.adminBookings.extendDialogConfirm }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("admin-booking-extend-success")).toBeInTheDocument(),
    );
    expect(extendMock).toHaveBeenCalled();
    const [, iso] = extendMock.mock.calls[0];
    expect(iso).toContain("2099-12-01");
  });

  it("shows field error when extend deadline missing", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByTestId("admin-booking-extend-button"));
    await user.click(
      screen.getByRole("button", { name: messages.adminBookings.extendDialogConfirm }),
    );
    expect(
      await screen.findByTestId("admin-booking-extend-deadline-error"),
    ).toHaveTextContent(messages.adminBookings.errors.extendDeadlineRequired);
    expect(extendMock).not.toHaveBeenCalled();
  });

  it("surfaces 409 on reopen", async () => {
    const user = userEvent.setup();
    reopenMock.mockRejectedValue(
      new ApiError({
        status: 409,
        fieldErrors: {},
        nonFieldErrors: ["Only an expired payment window can be reopened."],
        raw: null,
      }),
    );
    renderDetail();
    await user.click(await screen.findByTestId("admin-booking-reopen-button"));
    await user.click(
      screen.getByRole("button", { name: messages.adminBookings.reopenDialogConfirm }),
    );
    expect(await screen.findByTestId("admin-booking-reopen-error")).toHaveTextContent(
      messages.adminBookings.errors.reopenNotExpired,
    );
  });
});