import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { AdminAvailableDatesPanel } from "./AdminAvailableDatesPanel.jsx";
import { isWithinAdvanceWindow, minBookableDateIso } from "./packagesApi.js";

const {
  listAdminPackageDatesMock,
  createAdminPackageDateMock,
  deleteAdminPackageDateMock,
  deactivateAdminPackageDateMock,
} = vi.hoisted(() => ({
  listAdminPackageDatesMock: vi.fn(),
  createAdminPackageDateMock: vi.fn(),
  deleteAdminPackageDateMock: vi.fn(),
  deactivateAdminPackageDateMock: vi.fn(),
}));

vi.mock("./packagesApi.js", async () => {
  const actual = await vi.importActual("./packagesApi.js");
  return {
    ...actual,
    listAdminPackageDates: listAdminPackageDatesMock,
    createAdminPackageDate: createAdminPackageDateMock,
    deleteAdminPackageDate: deleteAdminPackageDateMock,
    deactivateAdminPackageDate: deactivateAdminPackageDateMock,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  listAdminPackageDatesMock.mockResolvedValue([]);
});

describe("Admin available dates", () => {
  it("warns when selected date is within advance window", async () => {
    const user = userEvent.setup();
    render(<AdminAvailableDatesPanel packageId="pkg-1" />);
    await screen.findByRole("heading", { name: messages.packages.datesTitle });

    const near = new Date();
    near.setDate(near.getDate() + 2);
    const iso = near.toISOString().slice(0, 10);
    expect(isWithinAdvanceWindow(iso)).toBe(true);

    fireEvent.change(screen.getByLabelText(messages.packages.fields.tourDate), {
      target: { value: iso },
    });
    expect(
      await screen.findByText(
        messages.packages.advanceWarning.replace(
          "{minDate}",
          minBookableDateIso(),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("adds a date via Admin API", async () => {
    const user = userEvent.setup();
    createAdminPackageDateMock.mockResolvedValue({
      id: "d1",
      tour_date: "2030-01-15",
      is_active: true,
    });
    listAdminPackageDatesMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "d1", tour_date: "2030-01-15", is_active: true },
      ]);

    render(<AdminAvailableDatesPanel packageId="pkg-1" />);
    await screen.findByRole("heading", { name: messages.packages.datesTitle });
    fireEvent.change(screen.getByLabelText(messages.packages.fields.tourDate), {
      target: { value: "2030-01-15" },
    });
    await user.click(
      screen.getByRole("button", { name: messages.packages.addDate }),
    );
    await waitFor(() => {
      expect(createAdminPackageDateMock).toHaveBeenCalledWith("pkg-1", {
        tour_date: "2030-01-15",
      });
    });
    expect(await screen.findByText("2030-01-15")).toBeInTheDocument();
  });

  it("removes an unreferenced date after confirm", async () => {
    const user = userEvent.setup();
    listAdminPackageDatesMock
      .mockResolvedValueOnce([
        { id: "d1", tour_date: "2030-01-15", is_active: true },
      ])
      .mockResolvedValueOnce([]);
    deleteAdminPackageDateMock.mockResolvedValue(null);

    render(<AdminAvailableDatesPanel packageId="pkg-1" />);
    expect(await screen.findByText("2030-01-15")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.packages.removeDate }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmRemoveDateTitle,
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: messages.packages.removeDate,
      }),
    );
    await waitFor(() => {
      expect(deleteAdminPackageDateMock).toHaveBeenCalledWith("pkg-1", "d1");
    });
  });

  it("deactivates a date after confirm", async () => {
    const user = userEvent.setup();
    listAdminPackageDatesMock
      .mockResolvedValueOnce([
        { id: "d1", tour_date: "2030-01-15", is_active: true },
      ])
      .mockResolvedValueOnce([
        { id: "d1", tour_date: "2030-01-15", is_active: false },
      ]);
    deactivateAdminPackageDateMock.mockResolvedValue({
      id: "d1",
      tour_date: "2030-01-15",
      is_active: false,
    });

    render(<AdminAvailableDatesPanel packageId="pkg-1" />);
    expect(await screen.findByText("2030-01-15")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.packages.deactivateDate }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmDeactivateDateTitle,
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: messages.packages.deactivateDate,
      }),
    );
    await waitFor(() => {
      expect(deactivateAdminPackageDateMock).toHaveBeenCalledWith("pkg-1", "d1");
    });
    expect(
      await screen.findByText(messages.packages.dateInactive),
    ).toBeInTheDocument();
  });
});
