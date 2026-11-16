import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { ApiError } from "../../services/apiClient.js";
import { ExplorePage } from "../packages/ExplorePage.jsx";

const {
  ensureCsrfMock,
  meMock,
  fetchRecommendationsMock,
  listPublishedPackagesMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  fetchRecommendationsMock: vi.fn(),
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

vi.mock("./recommendationsApi.js", async () => {
  const actual = await vi.importActual("./recommendationsApi.js");
  return {
    ...actual,
    fetchRecommendations: fetchRecommendationsMock,
  };
});

vi.mock("../packages/packagesApi.js", async () => {
  const actual = await vi.importActual("../packages/packagesApi.js");
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

function guestMeReject() {
  meMock.mockRejectedValue(
    Object.assign(new Error("Authentication credentials were not provided."), {
      name: "ApiError",
      status: 401,
      fieldErrors: {},
      nonFieldErrors: ["Authentication credentials were not provided."],
    }),
  );
}

function renderAi(path = "/ai") {
  guestMeReject();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const sampleResults = [
  {
    id: "pkg-ai-1",
    title: "Coastal Escape",
    cover_image: "/media/packages/coast.jpg",
    short_description: "Beach days and calm evenings.",
    destinations: "Cox's Bazar",
    duration_days: 3,
    duration_nights: 2,
    base_price: "12500.00",
    currency: "BDT",
    why: "Matches beach and weekend preferences.",
  },
  {
    id: "pkg-ai-2",
    title: "Mangrove Trail",
    cover_image: "",
    short_description: "Sundarbans wildlife.",
    destinations: "Sundarbans",
    duration_days: 4,
    duration_nights: 3,
    base_price: "18000.00",
    currency: "BDT",
    why: "Matches mangrove adventure keywords.",
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockMatchMedia(true);
  fetchRecommendationsMock.mockReset();
  listPublishedPackagesMock.mockReset();
  listPublishedPackagesMock.mockResolvedValue({ count: 0, results: [] });
});

describe("AI recommendations UI", () => {
  it("shows ≤5 RecommendationCards with why and detail links", async () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      ...sampleResults[0],
      id: `pkg-ai-${i + 1}`,
      title: `Tour ${i + 1}`,
      why: `Why ${i + 1}`,
    }));
    fetchRecommendationsMock.mockResolvedValue({ results: six });
    renderAi();

    expect(
      await screen.findByRole("heading", { name: messages.ai.title }),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByTestId("ai-prompt-input"),
      "beach weekend under budget",
    );
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-results-list")).toBeInTheDocument();
    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      "beach weekend under budget",
    );
    const cards = screen.getAllByTestId(/recommendation-card-pkg-ai-/);
    expect(cards).toHaveLength(5);
    expect(screen.getByTestId("recommendation-card-pkg-ai-1")).toHaveAttribute(
      "href",
      "/explore/pkg-ai-1",
    );
    expect(screen.getByTestId("recommendation-card-why-pkg-ai-1")).toHaveTextContent(
      "Why 1",
    );
    expect(
      within(screen.getByTestId("recommendation-card-pkg-ai-1")).getByRole(
        "heading",
        { level: 3, name: "Tour 1" },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("recommendation-card-cover-pkg-ai-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("recommendation-card-price-pkg-ai-1"),
    ).toHaveTextContent("12,500.00 BDT");
    expect(
      screen.getByTestId("recommendation-card-price-pkg-ai-1").textContent,
    ).not.toMatch(/\$/);
    expect(screen.queryByTestId("ai-empty-success")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-provider-fail")).not.toBeInTheDocument();
  });

  it("happy path shows empty-cover when cover_image is blank", async () => {
    fetchRecommendationsMock.mockResolvedValue({
      results: [sampleResults[1]],
    });
    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "mangrove");
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-results-list")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("recommendation-card-pkg-ai-2")).getByRole(
        "heading",
        { level: 3, name: "Mangrove Trail" },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("recommendation-card-cover-empty-pkg-ai-2"),
    ).toBeInTheDocument();
  });

  it("shows empty-success fallback without error chrome", async () => {
    fetchRecommendationsMock.mockResolvedValue({ results: [] });
    renderAi();

    await userEvent.type(screen.getByTestId("ai-prompt-input"), "antarctica");
    await userEvent.click(screen.getByTestId("ai-submit"));

    const empty = await screen.findByTestId("ai-empty-success");
    expect(
      within(empty).getByRole("heading", { name: messages.ai.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ai-empty-explore")).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.queryByTestId("ai-results-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-provider-fail")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows field error on blank prompt without calling API", async () => {
    renderAi();
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-prompt-error")).toHaveTextContent(
      messages.ai.errors.promptRequired,
    );
    expect(fetchRecommendationsMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("ai-results-list")).not.toBeInTheDocument();
  });

  it("maps 400 prompt field errors without cards", async () => {
    fetchRecommendationsMock.mockRejectedValue(
      new ApiError({
        status: 400,
        fieldErrors: { prompt: ["Ensure this value has at most 2000 characters."] },
        nonFieldErrors: [],
        raw: { prompt: ["Ensure this value has at most 2000 characters."] },
      }),
    );
    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "valid looking");
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-prompt-error")).toHaveTextContent(
      "Ensure this value has at most 2000 characters.",
    );
    expect(screen.queryByTestId("ai-results-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-provider-fail")).not.toBeInTheDocument();
  });

  it("shows provider-failure fallback on 502/503", async () => {
    fetchRecommendationsMock.mockRejectedValue(
      new ApiError({
        status: 503,
        fieldErrors: { error: ["[object Object]"] },
        nonFieldErrors: [],
        raw: {
          error: {
            code: "provider_unavailable",
            message: "The recommendation provider is temporarily unavailable.",
          },
        },
      }),
    );
    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "beach");
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-provider-fail")).toBeInTheDocument();
    expect(screen.getByTestId("ai-provider-fail")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByTestId("ai-provider-fail-message")).toHaveTextContent(
      "The recommendation provider is temporarily unavailable.",
    );
    expect(screen.getByTestId("ai-fail-explore")).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.queryByTestId("ai-results-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-empty-success")).not.toBeInTheDocument();
  });

  it("shows provider-fail fallback on generic non-502/503 errors", async () => {
    fetchRecommendationsMock.mockRejectedValue(new Error("network down"));
    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "beach");
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-provider-fail")).toBeInTheDocument();
    expect(screen.getByTestId("ai-provider-fail")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByTestId("ai-provider-fail-message")).toHaveTextContent(
      messages.ai.errors.generic,
    );
    expect(screen.getByTestId("ai-fail-explore")).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.queryByTestId("ai-results-list")).not.toBeInTheDocument();
  });

  it("exposes loading progress and aria-live status", async () => {
    let resolveRecs;
    fetchRecommendationsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRecs = resolve;
        }),
    );
    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "sylhet tea");
    await userEvent.click(screen.getByTestId("ai-submit"));

    expect(await screen.findByTestId("ai-loading")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByTestId("ai-recommendations-form")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByTestId("ai-status-live")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByTestId("ai-status-live")).toHaveTextContent(
      messages.ai.loading,
    );

    resolveRecs({ results: sampleResults });
    expect(await screen.findByTestId("ai-results-list")).toBeInTheDocument();
  });

  it("keeps Explore usable when recommendations API fails (isolation)", async () => {
    fetchRecommendationsMock.mockRejectedValue(
      new ApiError({
        status: 502,
        fieldErrors: {},
        nonFieldErrors: [],
        raw: {
          error: {
            code: "provider_bad_response",
            message: "Bad upstream",
          },
        },
      }),
    );
    listPublishedPackagesMock.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "pkg-explore-1",
          title: "Explore Still Works",
          cover_image: "",
          short_description: "Catalog isolation.",
          destinations: "Sylhet",
          duration_days: 2,
          duration_nights: 1,
          base_price: "5000.00",
          currency: "BDT",
        },
      ],
    });

    renderAi();
    await userEvent.type(screen.getByTestId("ai-prompt-input"), "beach");
    await userEvent.click(screen.getByTestId("ai-submit"));
    expect(await screen.findByTestId("ai-fail-explore")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("ai-fail-explore"));

    expect(await screen.findByText("Explore Still Works")).toBeInTheDocument();
    expect(listPublishedPackagesMock).toHaveBeenCalled();
    expect(
      screen.getByTestId("package-card-pkg-explore-1"),
    ).toBeInTheDocument();
  });

  it("guest can open /ai without auth", async () => {
    renderAi();
    expect(await screen.findByTestId("ai-recommendations-page")).toBeInTheDocument();
    expect(screen.getByTestId("ai-submit")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: messages.a11y.mainNav });
    expect(within(nav).getByRole("link", { name: messages.nav.ai })).toHaveAttribute(
      "href",
      "/ai",
    );
  });
});

describe("Explore isolation helper", () => {
  it("ExplorePage still renders when recommendations mock is unused", async () => {
    guestMeReject();
    listPublishedPackagesMock.mockResolvedValue({ count: 0, results: [] });
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AuthProvider>
          <Routes>
            <Route path="/explore" element={<ExplorePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: messages.explore.emptyTitle }),
    ).toBeInTheDocument();
    expect(fetchRecommendationsMock).not.toHaveBeenCalled();
  });
});
