import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { minBookableDateIso } from "../packages/packagesApi.js";
import {
  CustomTourFormPage,
  validateCustomTourForm,
} from "./CustomTourFormPage.jsx";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("./customToursApi.js", () => ({
  createCustomTour: vi.fn(),
  getCustomTour: vi.fn(),
  reapplyCustomTour: vi.fn(),
}));

import {
  createCustomTour,
  getCustomTour,
  reapplyCustomTour,
} from "./customToursApi.js";

function renderForm() {
  return render(
    <MemoryRouter>
      <CustomTourFormPage />
    </MemoryRouter>,
  );
}

describe("validateCustomTourForm", () => {
  it("blocks missing title and start date too soon", () => {
    const minStart = minBookableDateIso();
    const tooSoon = new Date(minStart);
    tooSoon.setDate(tooSoon.getDate() - 1);
    const iso = tooSoon.toISOString().slice(0, 10);
    const errors = validateCustomTourForm(
      {
        title: "",
        destination: "Dhaka",
        start_date: iso,
        end_date: minStart,
        travelers: "1",
        estimated_budget: "1000",
        currency: "BDT",
        accommodation_preferences: "",
        transportation_preferences: "",
        preferred_activities: "",
        additional_requirements: "",
      },
      { minStartIso: minStart },
    );
    expect(errors.title).toBeTruthy();
    expect(errors.start_date).toBeTruthy();
  });
});

describe("CustomTourFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows field errors when required fields are empty", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByTestId("custom-tour-continue-review"));
    expect(
      screen.getByText(messages.customTour.errors.titleRequired),
    ).toBeInTheDocument();
    expect(createCustomTour).not.toHaveBeenCalled();
  });

  it("submits after review with idempotency key", async () => {
    const user = userEvent.setup();
    const minStart = minBookableDateIso();
    const end = new Date(minStart);
    end.setDate(end.getDate() + 2);
    const endIso = end.toISOString().slice(0, 10);

    createCustomTour.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      status: "PENDING",
    });

    renderForm();

    await user.type(screen.getByLabelText(messages.customTour.titleLabel), "Tea Trails");
    await user.type(
      screen.getByLabelText(messages.customTour.destinationLabel),
      "Sylhet",
    );
    await user.type(
      screen.getByLabelText(messages.customTour.startDateLabel),
      minStart,
    );
    await user.type(
      screen.getByLabelText(messages.customTour.endDateLabel),
      endIso,
    );
    await user.clear(screen.getByLabelText(messages.customTour.travelersLabel));
    await user.type(screen.getByLabelText(messages.customTour.travelersLabel), "2");
    await user.type(screen.getByLabelText(messages.customTour.budgetLabel), "50000");
    await user.click(screen.getByTestId("custom-tour-continue-review"));

    const review = screen.getByTestId("custom-tour-review-page");
    expect(review).toBeInTheDocument();
    await user.click(within(review).getByTestId("custom-tour-confirm-submit"));

    expect(createCustomTour).toHaveBeenCalledTimes(1);
    const [, options] = createCustomTour.mock.calls[0];
    expect(options.idempotencyKey).toBeTruthy();
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining("/app/customer/custom-tours/confirmation?id="),
      { replace: true },
    );
  });
});

describe("CustomTourFormPage reapply", () => {
  const tourId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  function renderReapply() {
    return render(
      <MemoryRouter>
        <CustomTourFormPage variant="reapply" tourId={tourId} />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows blocked state when reapply is disabled", async () => {
    getCustomTour.mockResolvedValue({
      id: tourId,
      status: "REJECTED",
      reapply_enabled: false,
      title: "Tea Trails",
      destination: "Sylhet",
      start_date: "2026-12-01",
      end_date: "2026-12-05",
      travelers: 2,
      estimated_budget: "50000",
      currency: "BDT",
    });
    renderReapply();
    expect(await screen.findByTestId("custom-tour-reapply-blocked")).toBeInTheDocument();
    expect(screen.getByText(messages.customTour.reapplyNotAllowedTitle)).toBeInTheDocument();
    expect(reapplyCustomTour).not.toHaveBeenCalled();
  });

  it("prefills, resubmits, and navigates to detail", async () => {
    const user = userEvent.setup();
    const minStart = minBookableDateIso();
    getCustomTour.mockResolvedValue({
      id: tourId,
      status: "REJECTED",
      reapply_enabled: true,
      title: "Tea Trails",
      destination: "Sylhet",
      start_date: minStart,
      end_date: minStart,
      travelers: 2,
      estimated_budget: "50000",
      currency: "BDT",
      accommodation_preferences: "",
      transportation_preferences: "",
      preferred_activities: "",
      additional_requirements: "",
    });
    reapplyCustomTour.mockResolvedValue({ id: tourId, status: "PENDING" });

    renderReapply();
    expect(await screen.findByTestId("custom-tour-form-page")).toBeInTheDocument();
    expect(screen.getByLabelText(messages.customTour.titleLabel)).toHaveValue(
      "Tea Trails",
    );
    expect(screen.getByText(messages.customTour.reapplyTitle)).toBeInTheDocument();

    await user.click(screen.getByTestId("custom-tour-continue-review"));
    const review = screen.getByTestId("custom-tour-review-page");
    await user.click(within(review).getByTestId("custom-tour-confirm-submit"));

    expect(reapplyCustomTour).toHaveBeenCalledTimes(1);
    expect(reapplyCustomTour).toHaveBeenCalledWith(
      tourId,
      expect.objectContaining({ title: "Tea Trails", destination: "Sylhet" }),
    );
    expect(createCustomTour).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      `/app/customer/custom-tours/${tourId}`,
      { replace: true },
    );
  });
});