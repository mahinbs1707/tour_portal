import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { formatPackagePrice } from "./packagesApi.js";

const {
  ensureCsrfMock,
  meMock,
  listAdminPackagesMock,
  createAdminPackageMock,
  publishAdminPackageMock,
  updateAdminPackageMock,
  getAdminPackageMock,
  unpublishAdminPackageMock,
  listAdminPackageDatesMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  listAdminPackagesMock: vi.fn(),
  createAdminPackageMock: vi.fn(),
  publishAdminPackageMock: vi.fn(),
  updateAdminPackageMock: vi.fn(),
  getAdminPackageMock: vi.fn(),
  unpublishAdminPackageMock: vi.fn(),
  listAdminPackageDatesMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", async () => {
  const actual = await vi.importActual("../../services/apiClient.js");
  return {
    ...actual,
    ensureCsrf: ensureCsrfMock,
    me: meMock,
    logout: vi.fn().mockResolvedValue(null),
    setSessionEndedHandler: vi.fn(),
  };
});

vi.mock("./packagesApi.js", async () => {
  const actual = await vi.importActual("./packagesApi.js");
  return {
    ...actual,
    listAdminPackages: listAdminPackagesMock,
    createAdminPackage: createAdminPackageMock,
    publishAdminPackage: publishAdminPackageMock,
    updateAdminPackage: updateAdminPackageMock,
    getAdminPackage: getAdminPackageMock,
    unpublishAdminPackage: unpublishAdminPackageMock,
    listAdminPackageDates: listAdminPackageDatesMock,
    createAdminPackageDate: vi.fn(),
    deleteAdminPackageDate: vi.fn(),
    deactivateAdminPackageDate: vi.fn(),
  };
});

const adminUser = {
  id: "a1",
  email: "admin@example.com",
  role: "ADMIN",
  is_staff: true,
  is_superuser: true,
};

function mockMatchMedia(matches = true) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderAdmin(path) {
  meMock.mockResolvedValue(adminUser);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockMatchMedia(true);
  listAdminPackagesMock.mockResolvedValue({ count: 0, results: [] });
  listAdminPackageDatesMock.mockResolvedValue([]);
});

describe("Admin packages UI", () => {
  it("shows empty state with create CTA", async () => {
    renderAdmin("/app/admin/packages");
    expect(
      await screen.findByRole("heading", { name: messages.packages.emptyTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: messages.packages.createCta }).length,
    ).toBeGreaterThan(0);
  });

  it("lists packages and links to edit", async () => {
    listAdminPackagesMock.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "pkg-1",
          title: "Cox Escape",
          destinations: "Cox's Bazar",
          base_price: "12500.00",
          currency: "BDT",
          status: "DRAFT",
        },
      ],
    });
    renderAdmin("/app/admin/packages");
    expect(await screen.findByText("Cox Escape")).toBeInTheDocument();
    expect(screen.getByText(/Draft/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cox Escape/ })).toHaveAttribute(
      "href",
      "/app/admin/packages/pkg-1",
    );
  });

  it("saves a valid draft then can publish from create form", async () => {
    const user = userEvent.setup();
    const draft = {
      id: "pkg-new",
      status: "DRAFT",
      title: "Cox Escape",
      short_description: "Short",
      full_description: "Full",
      destinations: "Cox",
      duration_days: 3,
      duration_nights: 2,
      starting_location: "Dhaka",
      base_price: "12500.00",
      currency: "BDT",
      included_services: "Hotel",
      excluded_services: "Flights",
      itinerary: "Day 1",
      difficulty: "",
      cancellation_policy: "",
      additional_info: "",
    };
    createAdminPackageMock.mockResolvedValue(draft);
    getAdminPackageMock.mockResolvedValue(draft);
    updateAdminPackageMock.mockResolvedValue(draft);
    publishAdminPackageMock.mockResolvedValue({
      ...draft,
      status: "PUBLISHED",
    });

    renderAdmin("/app/admin/packages/new");
    expect(
      await screen.findByRole("heading", { name: messages.packages.createTitle }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(messages.packages.fields.title),
      "Cox Escape",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.shortDescription),
      "Short",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.fullDescription),
      "Full",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.destinations),
      "Cox",
    );
    await user.clear(
      screen.getByLabelText(messages.packages.fields.durationDays),
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.durationDays),
      "3",
    );
    await user.clear(
      screen.getByLabelText(messages.packages.fields.durationNights),
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.durationNights),
      "2",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.startingLocation),
      "Dhaka",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.basePrice),
      "12500.00",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.includedServices),
      "Hotel",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.excludedServices),
      "Flights",
    );
    await user.type(
      screen.getByLabelText(messages.packages.fields.itinerary),
      "Day 1",
    );

    await user.click(
      screen.getByRole("button", { name: messages.packages.saveDraft }),
    );

    await waitFor(() => {
      expect(createAdminPackageMock).toHaveBeenCalled();
    });
    const payload = createAdminPackageMock.mock.calls[0][0];
    expect(payload.title).toBe("Cox Escape");
    expect(payload.currency).toBe("BDT");
    expect(payload).not.toHaveProperty("seats");
    expect(payload).not.toHaveProperty("capacity");

    expect(
      await screen.findByRole("button", { name: messages.packages.publish }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.packages.publish }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmPublishTitle,
    });
    await user.click(
      within(dialog).getByRole("button", { name: messages.packages.publish }),
    );
    await waitFor(() => {
      expect(updateAdminPackageMock).toHaveBeenCalled();
      expect(publishAdminPackageMock).toHaveBeenCalledWith("pkg-new");
    });
    expect(
      await screen.findByText(messages.packages.statusPublished),
    ).toBeInTheDocument();
  });

  it("formats price as amount CODE without dollar sign", () => {
    expect(formatPackagePrice("12500.00", "bdt")).toBe("12,500.00 BDT");
    expect(formatPackagePrice("12500.00", "bdt")).not.toMatch(/\$/);
  });

  it("confirms unpublish and keeps package as draft", async () => {
    const user = userEvent.setup();
    const published = {
      id: "pkg-1",
      title: "Cox Escape",
      short_description: "Short",
      full_description: "Full",
      destinations: "Cox",
      duration_days: 3,
      duration_nights: 2,
      starting_location: "Dhaka",
      base_price: "12500.00",
      currency: "BDT",
      included_services: "Hotel",
      excluded_services: "Flights",
      itinerary: "Day 1",
      difficulty: "",
      cancellation_policy: "",
      additional_info: "",
      status: "PUBLISHED",
    };
    getAdminPackageMock.mockResolvedValue(published);
    unpublishAdminPackageMock.mockResolvedValue({
      ...published,
      status: "DRAFT",
    });

    renderAdmin("/app/admin/packages/pkg-1");
    expect(
      await screen.findByRole("button", { name: messages.packages.unpublish }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: messages.packages.unpublish }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: messages.packages.confirmUnpublishTitle,
    });
    expect(dialog).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", {
        name: messages.packages.unpublish,
      }),
    );
    await waitFor(() => {
      expect(unpublishAdminPackageMock).toHaveBeenCalledWith("pkg-1");
    });
    expect(
      await screen.findByText(messages.packages.statusDraft),
    ).toBeInTheDocument();
  });
});
