import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";

const { getMock, approveMock, rejectMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  approveMock: vi.fn(),
  rejectMock: vi.fn(),
}));

vi.mock("./adminBookingsApi.js", () => ({
  listAdminBookings: vi.fn(),
  getAdminBooking: (...args) => getMock(...args),
  approveAdminBooking: (...args) => approveMock(...args),
  rejectAdminBooking: (...args) => rejectMock(...args),
}));

import { AdminBookingDetailPage } from "./AdminBookingDetailPage.jsx";

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
  rejection_reason: "",
};

const REASON = "No capacity on that date.";

function apiError(status, message = "x", fieldErrors = {}) {
  return new ApiError({
    status,
    fieldErrors,
    nonFieldErrors: message ? [message] : [],
    raw: null,
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/app/admin/bookings/b-1"]}>
      <Routes>
        <Route path="/app/admin/bookings/:id" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openReject(user) {
  renderDetail();
  await user.click(await screen.findByTestId("admin-booking-reject-button"));
  return screen.findByRole("alertdialog");
}

function confirmButton() {
  return screen.getByRole("button", { name: messages.adminBookings.rejectDialogConfirm });
}

beforeEach(() => {
  getMock.mockReset();
  approveMock.mockReset();
  rejectMock.mockReset();
  getMock.mockResolvedValue(PENDING);
});

afterEach(() => {
  cleanup();
});

describe("AdminBookingDetailPage — reject (Story 6.3)", () => {
  it("shows Reject only while PENDING", async () => {
    renderDetail();
    expect(await screen.findByTestId("admin-booking-reject-button")).toBeInTheDocument();
    cleanup();
    getMock.mockResolvedValue({ ...PENDING, status: "CANCELLED" });
    renderDetail();
    await screen.findByTestId("admin-booking-detail-reference");
    expect(screen.queryByTestId("admin-booking-reject-button")).toBeNull();
  });

  it("opens an alertdialog with a required, focused reason field and no request yet", async () => {
    const user = userEvent.setup();
    const dialog = await openReject(user);

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent(messages.adminBookings.rejectDialogTitle);
    expect(dialog).toHaveTextContent("ABCDEF123456");
    const field = screen.getByLabelText(messages.adminBookings.rejectReasonLabel);
    expect(field).toBeRequired();
    expect(field).toHaveAttribute("maxlength", "2000");
    expect(field).toHaveFocus();
    expect(rejectMock).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   \n  "],
  ])("blocks a %s reason with a field error and sends nothing", async (_label, text) => {
    const user = userEvent.setup();
    await openReject(user);
    if (text) {
      await user.type(screen.getByTestId("admin-booking-reject-reason"), text);
    }

    await user.click(confirmButton());

    const alert = await screen.findByTestId("admin-booking-reject-reason-error");
    expect(alert).toHaveTextContent(messages.adminBookings.errors.rejectReasonRequired);
    expect(alert).toHaveAttribute("role", "alert");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(rejectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-booking-reject-reason")).toHaveFocus();
  });

  it("clears the field error as the Admin types", async () => {
    const user = userEvent.setup();
    await openReject(user);
    await user.click(confirmButton());
    await screen.findByTestId("admin-booking-reject-reason-error");

    await user.type(screen.getByTestId("admin-booking-reject-reason"), "x");

    expect(screen.queryByTestId("admin-booking-reject-reason-error")).toBeNull();
  });

  it("blocks a reason over 2000 characters (after trimming)", async () => {
    const user = userEvent.setup();
    await openReject(user);
    const field = screen.getByTestId("admin-booking-reject-reason");
    // maxLength stops typing past 2000, so force an over-limit value directly.
    field.removeAttribute("maxlength");
    await user.click(field);
    await user.paste("x".repeat(2001));

    await user.click(confirmButton());

    expect(await screen.findByTestId("admin-booking-reject-reason-error")).toHaveTextContent(
      "2000",
    );
    expect(rejectMock).not.toHaveBeenCalled();
  });

  it("cancelling the dialog does not reject and keeps the controls", async () => {
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.click(
      screen.getByRole("button", { name: messages.adminBookings.rejectDialogKeep }),
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(rejectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-booking-reject-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-booking-approve-button")).toBeInTheDocument();
  });

  it("Esc closes the dialog and restores focus to Reject", async () => {
    const user = userEvent.setup();
    await openReject(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByTestId("admin-booking-reject-button")).toHaveFocus();
  });

  it("reopening the dialog starts with an empty reason", async () => {
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), "stale text");
    await user.keyboard("{Escape}");

    await user.click(screen.getByTestId("admin-booking-reject-button"));

    expect(await screen.findByTestId("admin-booking-reject-reason")).toHaveValue("");
  });

  it("on success sends the trimmed reason, stays on detail, shows status + persisted reason, and hides controls", async () => {
    rejectMock.mockResolvedValue({
      ...PENDING,
      status: "REJECTED",
      rejection_reason: REASON,
    });
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), `  ${REASON}  `);

    await user.click(confirmButton());

    const status = await screen.findByTestId("admin-booking-reject-success");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveTextContent("ABCDEF123456");
    expect(rejectMock).toHaveBeenCalledTimes(1);
    expect(rejectMock).toHaveBeenCalledWith("b-1", REASON);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByTestId("admin-booking-detail-booking-status")).toHaveTextContent(
      messages.booking.bookingStatus.REJECTED,
    );
    expect(screen.getByTestId("admin-booking-detail-window-status")).toHaveTextContent(
      messages.booking.windowStatus.NOT_OPEN,
    );
    expect(screen.getByTestId("admin-booking-detail-rejection-reason")).toHaveTextContent(
      REASON,
    );
    expect(screen.queryByTestId("admin-booking-reject-button")).toBeNull();
    expect(screen.queryByTestId("admin-booking-approve-button")).toBeNull();
    expect(approveMock).not.toHaveBeenCalled();
  });

  it("server-side 400 on the reason keeps the dialog open with the field error", async () => {
    rejectMock.mockRejectedValue(
      apiError(400, "", { rejection_reason: ["Enter a reason for rejecting this booking."] }),
    );
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.click(confirmButton());

    expect(await screen.findByTestId("admin-booking-reject-reason-error")).toHaveTextContent(
      "Enter a reason for rejecting this booking.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByTestId("admin-booking-reject-reason")).toHaveValue(REASON);
  });

  it("409 shows a not-pending alert and refreshes the booking (controls disappear)", async () => {
    rejectMock.mockRejectedValue(apiError(409, "Only pending bookings can be rejected."));
    getMock.mockResolvedValueOnce(PENDING);
    getMock.mockResolvedValue({ ...PENDING, status: "APPROVED", payment_window_status: "OPEN" });
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.click(confirmButton());

    const alert = await screen.findByTestId("admin-booking-reject-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent(messages.adminBookings.errors.rejectNotPending);
    await waitFor(() =>
      expect(screen.queryByTestId("admin-booking-reject-button")).toBeNull(),
    );
    expect(screen.queryByTestId("admin-booking-reject-success")).toBeNull();
  });

  it("5xx/network says the outcome is unknown and refreshes", async () => {
    rejectMock.mockRejectedValue(apiError(500));
    getMock.mockResolvedValueOnce(PENDING);
    getMock.mockResolvedValue({
      ...PENDING,
      status: "REJECTED",
      rejection_reason: REASON,
    });
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.click(confirmButton());

    expect(await screen.findByTestId("admin-booking-reject-error")).toHaveTextContent(
      messages.adminBookings.errors.rejectOutcomeUnknown,
    );
    expect(
      await screen.findByTestId("admin-booking-detail-rejection-reason"),
    ).toHaveTextContent(REASON);
  });

  it("other 4xx shows a generic alert and keeps controls", async () => {
    rejectMock.mockRejectedValue(apiError(403, "Forbidden"));
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.click(confirmButton());

    expect(await screen.findByTestId("admin-booking-reject-error")).toHaveTextContent(
      messages.adminBookings.errors.rejectGeneric,
    );
    expect(screen.getByTestId("admin-booking-reject-button")).toBeInTheDocument();
  });

  it("a double-clicked confirm sends a single reject request", async () => {
    let resolveReject;
    rejectMock.mockImplementation(
      () => new Promise((resolve) => { resolveReject = resolve; }),
    );
    const user = userEvent.setup();
    await openReject(user);
    await user.type(screen.getByTestId("admin-booking-reject-reason"), REASON);

    await user.dblClick(confirmButton());
    resolveReject({ ...PENDING, status: "REJECTED", rejection_reason: REASON });

    await screen.findByTestId("admin-booking-reject-success");
    expect(rejectMock).toHaveBeenCalledTimes(1);
  });
});
