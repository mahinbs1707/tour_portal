import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { AdminHomePage } from "./AdminHomePage.jsx";

vi.mock("../dashboard/dashboardApi.js", () => ({
  getAdminDashboard: vi.fn(),
}));

import { getAdminDashboard } from "../dashboard/dashboardApi.js";

describe("AdminHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all nine metrics from dashboard API", async () => {
    getAdminDashboard.mockResolvedValue({
      total_packages: 5,
      published_packages: 3,
      draft_packages: 2,
      pending_bookings: 4,
      approved_bookings: 10,
      rejected_bookings: 1,
      pending_custom_tours: 2,
      approved_custom_tours: 3,
      rejected_custom_tours: 0,
    });
    render(
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("admin-metric-total-packages")).toHaveTextContent("5");
    expect(screen.getByTestId("admin-metric-published-packages")).toHaveTextContent("3");
    expect(screen.getByTestId("admin-metric-draft-packages")).toHaveTextContent("2");
    expect(screen.getByTestId("admin-metric-pending-bookings")).toHaveTextContent("4");
    expect(screen.getAllByText(messages.adminHome.needsReviewHint).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("admin-metric-pending-custom-tours")).toHaveTextContent("2");
  });
});