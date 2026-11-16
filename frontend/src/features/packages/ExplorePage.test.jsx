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

  it("applies search and filters on submit and resets to page 1", async () => {
    const user = userEvent.setup();
    listPublishedPackagesMock
      .mockResolvedValueOnce({ count: 0, results: [] })
      .mockResolvedValueOnce({
        count: 1,
        results: [
          {
            id: "pkg-filtered",
            title: "Sylhet Tea",
            cover_image: "/media/packages/tea.jpg",
            short_description: "Tea trails.",
            destinations: "Sylhet",
            duration_days: 3,
            duration_nights: 2,
            base_price: "11000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByTestId("explore-empty")).toBeInTheDocument();

    await user.type(screen.getByTestId("explore-search-q"), "tea");
    await user.type(screen.getByTestId("explore-filter-destination"), "Sylhet");
    await user.type(screen.getByTestId("explore-filter-min-price"), "10000");
    await user.type(screen.getByTestId("explore-filter-max-price"), "15000");
    await user.type(screen.getByTestId("explore-filter-duration"), "3");
    await user.click(screen.getByTestId("explore-apply-filters"));

    expect(await screen.findByText("Sylhet Tea")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenLastCalledWith({
      page: 1,
      q: "tea",
      destination: "Sylhet",
      min_price: "10000",
      max_price: "15000",
      duration_days: "3",
    });
  });

  it("shows no-match empty state with clear restoring default catalog", async () => {
    const user = userEvent.setup();
    listPublishedPackagesMock
      .mockResolvedValueOnce({
        count: 1,
        results: [
          {
            id: "pkg-catalog",
            title: "Catalog Tour",
            cover_image: "/media/packages/c.jpg",
            short_description: "Visible.",
            destinations: "Dhaka",
            duration_days: 2,
            duration_nights: 1,
            base_price: "5000.00",
            currency: "BDT",
          },
        ],
      })
      .mockResolvedValueOnce({ count: 0, results: [] })
      .mockResolvedValueOnce({
        count: 1,
        results: [
          {
            id: "pkg-catalog",
            title: "Catalog Tour",
            cover_image: "/media/packages/c.jpg",
            short_description: "Visible.",
            destinations: "Dhaka",
            duration_days: 2,
            duration_nights: 1,
            base_price: "5000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByText("Catalog Tour")).toBeInTheDocument();

    await user.type(screen.getByTestId("explore-search-q"), "nowhere");
    await user.click(screen.getByTestId("explore-apply-filters"));

    expect(
      await screen.findByRole("heading", { name: messages.explore.noMatchTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("explore-no-match")).toBeInTheDocument();
    expect(screen.queryByTestId("explore-empty")).not.toBeInTheDocument();
    expect(screen.getByText(messages.explore.noMatchBody)).toBeInTheDocument();

    await user.click(screen.getByTestId("explore-no-match-clear"));
    expect(await screen.findByText("Catalog Tour")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenLastCalledWith({ page: 1 });
    expect(screen.getByTestId("explore-search-q")).toHaveValue("");
  });

  it("Apply from page 2 resets to page 1 with filters", async () => {
    const user = userEvent.setup();
    const pageOne = {
      count: 21,
      next: "http://example.test/api/packages/?page=2",
      previous: null,
      results: [
        {
          id: "pkg-p1",
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
    };
    listPublishedPackagesMock
      .mockResolvedValueOnce(pageOne)
      .mockResolvedValueOnce({
        ...pageOne,
        results: [{ ...pageOne.results[0], id: "pkg-p2", title: "Page Two Tour" }],
        next: null,
        previous: "http://example.test/api/packages/",
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: "pkg-applied",
            title: "Filtered From Page Two",
            cover_image: "/media/packages/f.jpg",
            short_description: "After apply.",
            destinations: "Sylhet",
            duration_days: 3,
            duration_nights: 2,
            base_price: "9000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByText("Page One Tour")).toBeInTheDocument();
    await user.click(screen.getByTestId("explore-next-page"));
    expect(await screen.findByText("Page Two Tour")).toBeInTheDocument();

    await user.type(screen.getByTestId("explore-search-q"), "Filtered");
    await user.click(screen.getByTestId("explore-apply-filters"));

    expect(await screen.findByText("Filtered From Page Two")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenLastCalledWith({
      page: 1,
      q: "Filtered",
    });
  });

  it("pagination next keeps applied filters", async () => {
    const user = userEvent.setup();
    listPublishedPackagesMock
      .mockResolvedValueOnce({ count: 0, results: [] })
      .mockResolvedValueOnce({
        count: 21,
        next: "http://example.test/api/packages/?page=2&q=tea",
        previous: null,
        results: [
          {
            id: "pkg-f1",
            title: "Tea Page One",
            cover_image: "/media/packages/t1.jpg",
            short_description: "First.",
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
        previous: "http://example.test/api/packages/?q=tea",
        results: [
          {
            id: "pkg-f2",
            title: "Tea Page Two",
            cover_image: "/media/packages/t2.jpg",
            short_description: "Second.",
            destinations: "Sylhet",
            duration_days: 3,
            duration_nights: 2,
            base_price: "9000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByTestId("explore-empty")).toBeInTheDocument();
    await user.type(screen.getByTestId("explore-search-q"), "tea");
    await user.click(screen.getByTestId("explore-apply-filters"));
    expect(await screen.findByText("Tea Page One")).toBeInTheDocument();

    await user.click(screen.getByTestId("explore-next-page"));
    expect(await screen.findByText("Tea Page Two")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenLastCalledWith({
      page: 2,
      q: "tea",
    });
  });

  it("explore-clear-filters restores default catalog and clears controls", async () => {
    const user = userEvent.setup();
    listPublishedPackagesMock
      .mockResolvedValueOnce({ count: 0, results: [] })
      .mockResolvedValueOnce({
        count: 1,
        results: [
          {
            id: "pkg-hit",
            title: "Hit Tour",
            cover_image: "/media/packages/h.jpg",
            short_description: "Match.",
            destinations: "Dhaka",
            duration_days: 2,
            duration_nights: 1,
            base_price: "5000.00",
            currency: "BDT",
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 1,
        results: [
          {
            id: "pkg-default",
            title: "Default Tour",
            cover_image: "/media/packages/d.jpg",
            short_description: "Restored.",
            destinations: "Dhaka",
            duration_days: 2,
            duration_nights: 1,
            base_price: "5000.00",
            currency: "BDT",
          },
        ],
      });

    renderExplore();
    expect(await screen.findByTestId("explore-empty")).toBeInTheDocument();
    await user.type(screen.getByTestId("explore-search-q"), "Hit");
    await user.type(screen.getByTestId("explore-filter-destination"), "Dhaka");
    await user.click(screen.getByTestId("explore-apply-filters"));
    expect(await screen.findByText("Hit Tour")).toBeInTheDocument();

    await user.click(screen.getByTestId("explore-clear-filters"));
    expect(await screen.findByText("Default Tour")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenLastCalledWith({ page: 1 });
    expect(screen.getByTestId("explore-search-q")).toHaveValue("");
    expect(screen.getByTestId("explore-filter-destination")).toHaveValue("");
  });

  it("400 ApiError shows error banner with message", async () => {
    listPublishedPackagesMock.mockRejectedValue(
      new ApiError({
        status: 400,
        fieldErrors: { min_price: ["Price cannot be negative."] },
        nonFieldErrors: [],
        raw: null,
      }),
    );
    renderExplore();
    expect(await screen.findByTestId("explore-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Price cannot be negative.",
    );
    expect(screen.queryByTestId("explore-empty")).not.toBeInTheDocument();
  });

});
