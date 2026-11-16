import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { ApiError } from "../../services/apiClient.js";
import { formatTourDate } from "./PackageDetailPage.jsx";

const {
  ensureCsrfMock,
  meMock,
  getPublishedPackageMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  getPublishedPackageMock: vi.fn(),
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
    getPublishedPackage: getPublishedPackageMock,
    listPublishedPackages: vi.fn().mockResolvedValue({ count: 0, results: [] }),
  };
});

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

const BOOKABLE_PKG = {
  id: "pkg-bookable-1",
  title: "Cox's Bazar Escape",
  cover_image: "/media/packages/cover.jpg",
  additional_images: ["/media/packages/extra.jpg"],
  short_description: "Coastal calm weekend.",
  full_description: "Two nights by the bay.",
  destinations: "Cox's Bazar",
  duration_days: 3,
  duration_nights: 2,
  starting_location: "Dhaka",
  available_dates: [
    { id: "d1", tour_date: "2026-12-01" },
    { id: "d0", tour_date: "2026-12-15" },
  ],
  difficulty: "Easy",
  base_price: "12500.00",
  currency: "BDT",
  included_services: "Hotel, breakfast",
  excluded_services: "Flights",
  itinerary: "Day 1 arrive.",
  cancellation_policy: "Free cancel 14 days prior.",
  additional_info: "Bring sunscreen.",
  is_bookable: true,
  unavailable_reason: null,
};

const UNBOOKABLE_PKG = {
  ...BOOKABLE_PKG,
  id: "pkg-unbookable-1",
  title: "Quiet Hills",
  is_bookable: false,
  unavailable_reason: "No qualifying travel dates are available for booking.",
  available_dates: [],
};

function guestMe() {
  meMock.mockRejectedValue(
    Object.assign(new Error("Authentication credentials were not provided."), {
      name: "ApiError",
      status: 401,
      fieldErrors: {},
      nonFieldErrors: ["Authentication credentials were not provided."],
    }),
  );
}

function customerMe() {
  meMock.mockResolvedValue({
    id: "u-customer",
    email: "customer@example.com",
    full_name: "Casey",
    role: "CUSTOMER",
  });
}

function adminMe() {
  meMock.mockResolvedValue({
    id: "u-admin",
    email: "admin@example.com",
    full_name: "Ada",
    role: "ADMIN",
  });
}

function renderDetail(path, { asCustomer = false, asAdmin = false } = {}) {
  if (asAdmin) {
    adminMe();
  } else if (asCustomer) {
    customerMe();
  } else {
    guestMe();
  }
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
  getPublishedPackageMock.mockResolvedValue(BOOKABLE_PKG);
});

describe("PackageDetailPage", () => {
  it("shows sections, formatted dates list, and Book Now for Guest", async () => {
    renderDetail(`/explore/${BOOKABLE_PKG.id}`);
    expect(
      await screen.findByRole("heading", { name: BOOKABLE_PKG.title }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("package-detail-price")).toHaveTextContent(
      "12,500.00 BDT",
    );
    const datesList = screen.getByTestId("package-detail-dates-list");
    const items = within(datesList).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(formatTourDate("2026-12-01"));
    expect(items[1]).toHaveTextContent(formatTourDate("2026-12-15"));
    const cta = screen.getByTestId("package-detail-book-now");
    expect(cta).toHaveTextContent(messages.explore.bookNow);
    expect(cta).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent(`/explore/${BOOKABLE_PKG.id}`)}`,
    );
  });

  it("hides Book Now, maps unavailable reason, and shows empty dates copy", async () => {
    getPublishedPackageMock.mockResolvedValue(UNBOOKABLE_PKG);
    renderDetail(`/explore/${UNBOOKABLE_PKG.id}`);
    expect(
      await screen.findByRole("heading", { name: UNBOOKABLE_PKG.title }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("package-detail-book-now")).not.toBeInTheDocument();
    expect(screen.getByTestId("package-detail-unavailable")).toHaveTextContent(
      messages.explore.bookingUnavailableNoDates,
    );
    expect(screen.getByTestId("package-detail-dates-empty")).toHaveTextContent(
      messages.explore.detailDatesEmpty,
    );
  });

  it("Customer Book Now links to booking stub with package id", async () => {
    renderDetail(`/explore/${BOOKABLE_PKG.id}`, { asCustomer: true });
    const cta = await screen.findByTestId("package-detail-book-now");
    expect(cta).toHaveAttribute(
      "href",
      `/app/bookings/new?package=${encodeURIComponent(BOOKABLE_PKG.id)}`,
    );
  });

  it("Admin does not get Book Now", async () => {
    renderDetail(`/explore/${BOOKABLE_PKG.id}`, { asAdmin: true });
    expect(
      await screen.findByRole("heading", { name: BOOKABLE_PKG.title }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("package-detail-book-now")).not.toBeInTheDocument();
    expect(screen.queryByTestId("package-detail-unavailable")).not.toBeInTheDocument();
  });

  it("shows not-found for unpublished/missing packages", async () => {
    getPublishedPackageMock.mockRejectedValue(
      new ApiError({
        status: 404,
        fieldErrors: {},
        nonFieldErrors: ["Not found."],
        raw: null,
      }),
    );
    renderDetail("/explore/missing-id");
    expect(
      await screen.findByTestId("package-detail-not-found"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: messages.explore.detailNotFoundTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("package-detail-book-now")).not.toBeInTheDocument();
  });

  it("shows non-404 error as an alert", async () => {
    getPublishedPackageMock.mockRejectedValue(
      new ApiError({
        status: 500,
        fieldErrors: {},
        nonFieldErrors: ["Catalog unavailable."],
        raw: null,
      }),
    );
    renderDetail(`/explore/${BOOKABLE_PKG.id}`);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-testid", "package-detail-error");
    expect(alert).toHaveTextContent("Catalog unavailable.");
    expect(screen.queryByTestId("package-detail-not-found")).not.toBeInTheDocument();
  });

  it("uses empty-cover fallback when cover is blank", async () => {
    getPublishedPackageMock.mockResolvedValue({
      ...BOOKABLE_PKG,
      cover_image: "",
    });
    renderDetail(`/explore/${BOOKABLE_PKG.id}`);
    expect(
      await screen.findByTestId("package-detail-cover-empty"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("package-detail-cover-img")).not.toBeInTheDocument();
  });
});
