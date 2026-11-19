import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { CustomTourDetailPage } from "./CustomTourDetailPage.jsx";

vi.mock("./customToursApi.js", () => ({
  getCustomTour: vi.fn(),
}));

import { getCustomTour } from "./customToursApi.js";

function renderDetail(id) {
  return render(
    <MemoryRouter initialEntries={[`/app/customer/custom-tours/${id}`]}>
      <Routes>
        <Route
          path="/app/customer/custom-tours/:id"
          element={<CustomTourDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CustomTourDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows rejection guidance when present", async () => {
    getCustomTour.mockResolvedValue({
      id: "a-uuid",
      title: "Tea Trails",
      destination: "Sylhet",
      start_date: "2026-12-01",
      end_date: "2026-12-05",
      travelers: 2,
      estimated_budget: "50000.00",
      currency: "BDT",
      status: "REJECTED",
      reapply_enabled: true,
      created_at: "2026-11-18T00:00:00Z",
      rejection_reason: "Dates unavailable.",
      recommended_adjustments: "Pick later dates.",
      review_history: [
        {
          cycle: 1,
          decision: "REJECTED",
          rejection_reason: "Earlier draft conflict.",
          recommended_adjustments: "",
        },
      ],
    });
    renderDetail("a-uuid");
    expect(await screen.findByTestId("custom-tour-rejection-guidance")).toBeInTheDocument();
    expect(screen.getByText("Dates unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Pick later dates.")).toBeInTheDocument();
    expect(screen.getByTestId("custom-tour-reapply-cta")).toBeInTheDocument();
    expect(screen.getByTestId("custom-tour-review-history")).toBeInTheDocument();
    expect(screen.getByText("Earlier draft conflict.")).toBeInTheDocument();
  });

  it("hides reapply CTA when disabled", async () => {
    getCustomTour.mockResolvedValue({
      id: "b-uuid",
      title: "Closed",
      destination: "Dhaka",
      start_date: "2026-12-01",
      end_date: "2026-12-02",
      travelers: 1,
      estimated_budget: "10000.00",
      currency: "BDT",
      status: "REJECTED",
      reapply_enabled: false,
      created_at: "2026-11-18T00:00:00Z",
      rejection_reason: "No capacity.",
    });
    renderDetail("b-uuid");
    expect(await screen.findByTestId("custom-tour-reapply-status")).toBeInTheDocument();
    expect(screen.queryByTestId("custom-tour-reapply-cta")).not.toBeInTheDocument();
  });

  it("shows not found on 404", async () => {
    getCustomTour.mockRejectedValue(new ApiError({ status: 404, fieldErrors: {}, nonFieldErrors: [] }));
    renderDetail("missing");
    expect(
      await screen.findByText(messages.customTour.detailNotFoundTitle),
    ).toBeInTheDocument();
  });
});