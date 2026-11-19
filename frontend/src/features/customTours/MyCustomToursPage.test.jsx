import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { MyCustomToursPage } from "./MyCustomToursPage.jsx";

vi.mock("./customToursApi.js", () => ({
  listMyCustomTours: vi.fn(),
}));

import { listMyCustomTours } from "./customToursApi.js";

describe("MyCustomToursPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state with create CTA", async () => {
    listMyCustomTours.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MyCustomToursPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(messages.customTour.historyEmptyTitle),
    ).toBeInTheDocument();
    expect(screen.getByTestId("my-custom-tours-empty")).toBeInTheDocument();
    expect(screen.getByTestId("my-custom-tours-create")).toHaveAttribute(
      "href",
      "/app/customer/custom-tours/new",
    );
  });

  it("renders cards with status chips", async () => {
    listMyCustomTours.mockResolvedValue([
      {
        id: "a-uuid",
        title: "Tea Trails",
        destination: "Sylhet",
        start_date: "2026-12-01",
        end_date: "2026-12-05",
        status: "PENDING",
        created_at: "2026-11-18T00:00:00Z",
      },
    ]);
    render(
      <MemoryRouter>
        <MyCustomToursPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Tea Trails")).toBeInTheDocument();
    expect(screen.getByTestId("my-custom-tour-status-a-uuid")).toHaveTextContent(
      messages.customTour.customTourStatus.PENDING,
    );
  });
});