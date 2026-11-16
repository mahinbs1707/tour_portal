import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { ApiError } from "../../services/apiClient.js";

const {
  ensureCsrfMock,
  meMock,
  listPublishedPackagesMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  listPublishedPackagesMock: vi.fn(),
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
    listPublishedPackages: listPublishedPackagesMock,
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

function renderExplore(path = "/explore") {
  meMock.mockRejectedValue(
    Object.assign(new Error("Authentication credentials were not provided."), {
      name: "ApiError",
      status: 401,
      fieldErrors: {},
      nonFieldErrors: ["Authentication credentials were not provided."],
    }),
  );
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
  listPublishedPackagesMock.mockResolvedValue({ count: 0, results: [] });
});

describe("Explore public catalog UI", () => {
  it("shows empty state with one CTA to Landing", async () => {
    renderExplore();
    expect(
      await screen.findByRole("heading", { name: messages.explore.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.explore.emptyBody)).toBeInTheDocument();
    const cta = screen.getByTestId("explore-empty-cta");
    expect(cta).toHaveAttribute("href", "/");
    expect(cta).toHaveTextContent(messages.explore.emptyCta);
    expect(screen.queryByTestId("explore-card-list")).not.toBeInTheDocument();
  });

  it("lists published package cards with required fields and detail link", async () => {
    listPublishedPackagesMock.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "pkg-pub-1",
          title: "Cox Escape",
          cover_image: "/media/packages/cox.jpg",
          short_description: "Coastal calm weekend.",
          destinations: "Cox's Bazar",
          duration_days: 3,
          duration_nights: 2,
          base_price: "12500.00",
          currency: "BDT",
        },
      ],
    });
    renderExplore();

    expect(await screen.findByText("Cox Escape")).toBeInTheDocument();
    const card = screen.getByTestId("package-card-pkg-pub-1");
    expect(within(card).getByText("Coastal calm weekend.")).toBeInTheDocument();
    expect(
      within(card).getByTestId("package-card-destinations-pkg-pub-1"),
    ).toHaveTextContent("Cox's Bazar");
    expect(
      within(card).getByTestId("package-card-duration-pkg-pub-1"),
    ).toHaveTextContent(
      messages.explore.duration
        .replace("{days}", "3")
        .replace("{nights}", "2"),
    );
    expect(
      within(card).getByTestId("package-card-price-pkg-pub-1"),
    ).toHaveTextContent("12,500.00 BDT");
    expect(
      within(card).getByTestId("package-card-price-pkg-pub-1").textContent,
    ).not.toMatch(/\$/);
    expect(screen.getByTestId("package-card-cover-pkg-pub-1")).toHaveAttribute(
      "src",
      "/media/packages/cox.jpg",
    );
    expect(card).toHaveAttribute("href", "/explore/pkg-pub-1");
    expect(listPublishedPackagesMock).toHaveBeenCalled();
  });

  it("shows empty-cover test id when cover_image is empty", async () => {
    listPublishedPackagesMock.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "pkg-no-cover",
          title: "No Cover Tour",
          cover_image: "",
          short_description: "Missing cover.",
          destinations: "Dhaka",
          duration_days: 2,
          duration_nights: 1,
          base_price: "5000.00",
          currency: "BDT",
        },
      ],
    });
    renderExplore();
    expect(await screen.findByText("No Cover Tour")).toBeInTheDocument();
    expect(
      screen.getByTestId("package-card-cover-empty-pkg-no-cover"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("package-card-cover-pkg-no-cover"),
    ).not.toBeInTheDocument();
  });

  it("pagination next click requests page 2", async () => {
    const user = userEvent.setup();
    listPublishedPackagesMock
      .mockResolvedValueOnce({
        count: 21,
        next: "http://example.test/api/packages/?page=2",
        previous: null,
        results: [
          {
            id: "pkg-page-1",
            title: "Page One Tour",
            cover_image: "/media/packages/one.jpg",
            short_description: "First page.",
            destinations: "Sylhet",
            duration_days: 3,
            duration_nights: 2,
            base_price: "9000.00",
            currency: "BDT",
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 21,
        next: null,
        previous: "http://example.test/api/packages/",
        results: [
          {
            id: "pkg-page-2",
            title: "Page Two Tour",
            cover_image: "/media/packages/two.jpg",
            short_description: "Second page.",
            destinations: "Bandarban",
            duration_days: 4,
            duration_nights: 3,
            base_price: "11000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByText("Page One Tour")).toBeInTheDocument();
    await user.click(screen.getByTestId("explore-next-page"));
    expect(await screen.findByText("Page Two Tour")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenCalledWith({ page: 2 });
  });

  it("load rejection shows alert not empty state", async () => {
    listPublishedPackagesMock.mockRejectedValue(
      new ApiError({
        status: 500,
        fieldErrors: {},
        nonFieldErrors: ["Catalog unavailable."],
        raw: null,
      }),
    );
    renderExplore();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Catalog unavailable.",
    );
    expect(screen.getByTestId("explore-retry")).toBeInTheDocument();
    expect(screen.queryByTestId("explore-empty")).not.toBeInTheDocument();
  });

  it("shows loading state with aria-busy", async () => {
    let resolveList;
    listPublishedPackagesMock.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    renderExplore();
    const loading = await screen.findByTestId("explore-loading");
    expect(loading).toHaveAttribute("aria-busy", "true");
    resolveList({ count: 0, results: [] });
    expect(await screen.findByTestId("explore-empty")).toBeInTheDocument();
  });

});
