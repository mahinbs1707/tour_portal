import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { CustomerHomePage } from "./CustomerHomePage.jsx";

vi.mock("../dashboard/dashboardApi.js", () => ({
  getCustomerDashboard: vi.fn(),
}));

import { getCustomerDashboard } from "../dashboard/dashboardApi.js";

describe("CustomerHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard tiles from API", async () => {
    getCustomerDashboard.mockResolvedValue({
      pending_bookings: 2,
      open_payment_windows: 1,
      unread_notifications: 3,
    });
    render(
      <MemoryRouter>
        <CustomerHomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("customer-home-tile-pending-bookings")).toHaveTextContent(
      "2",
    );
    expect(screen.getByTestId("customer-home-tile-open-payments")).toHaveTextContent("1");
    expect(screen.getByTestId("customer-home-tile-unread-notifications")).toHaveTextContent("3");
    expect(screen.getByText(messages.customerHome.tiles.pendingBookings)).toBeInTheDocument();
  });
});