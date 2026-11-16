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
  listFeaturedPackagesMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  listFeaturedPackagesMock: vi.fn(),
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

vi.mock("../packages/packagesApi.js", async () => {
  const actual = await vi.importActual("../packages/packagesApi.js");
  return {
    ...actual,
    listFeaturedPackages: listFeaturedPackagesMock,
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

function renderLanding(path = "/") {
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
  listFeaturedPackagesMock.mockResolvedValue({ count: 0, results: [] });
});

describe("Landing hero and featured packages", () => {
  it("shows hero branding with Explore primary and AI secondary CTAs", async () => {
    renderLanding();

    expect(await screen.findByTestId("landing-hero")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: messages.landing.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.brand.promise)).toBeInTheDocument();
    expect(screen.getByText(messages.landing.subheading)).toBeInTheDocument();
    const heroCta = screen.getByTestId("landing-hero-cta");
    expect(heroCta).toHaveAttribute("href", "/explore");
    expect(heroCta).toHaveTextContent(messages.landing.heroCta);
    const aiCta = screen.getByTestId("landing-hero-ai-cta");
    expect(aiCta).toHaveAttribute("href", "/ai");
    expect(aiCta).toHaveTextContent(messages.landing.heroAiCta);
  });

  it("secondary AI CTA navigates to /ai recommendations page", async () => {
    renderLanding();
    await screen.findByTestId("landing-hero");
    await userEvent.click(screen.getByTestId("landing-hero-ai-cta"));
    expect(await screen.findByTestId("ai-recommendations-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: messages.ai.title }),
    ).toBeInTheDocument();
  });

  it("shows guest navigation to Explore, AI, Sign in, and Sign up", async () => {
    renderLanding();
    await screen.findByTestId("landing-hero");

    const nav = screen.getByRole("navigation", { name: messages.a11y.mainNav });
    expect(within(nav).getByRole("link", { name: messages.nav.explore })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(within(nav).getByRole("link", { name: messages.nav.ai })).toHaveAttribute(
      "href",
      "/ai",
    );
    expect(within(nav).getByRole("link", { name: messages.nav.signIn })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(within(nav).getByRole("link", { name: messages.nav.signUp })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("shows empty featured state with Explore CTA", async () => {
    renderLanding();

    expect(
      await screen.findByRole("heading", { name: messages.landing.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.landing.emptyBody)).toBeInTheDocument();
    const cta = screen.getByTestId("landing-featured-empty-cta");
    expect(cta).toHaveAttribute("href", "/explore");
    expect(cta).toHaveTextContent(messages.landing.emptyCta);
    expect(screen.queryByTestId("landing-featured-list")).not.toBeInTheDocument();
    expect(listFeaturedPackagesMock).toHaveBeenCalled();
  });

  it("lists featured package cards linking to detail", async () => {
    listFeaturedPackagesMock.mockResolvedValue({
      count: 1,
      results: [
        {
          id: "pkg-feat-1",
          title: "Featured Escape",
          cover_image: "/media/packages/feat.jpg",
          short_description: "A standout coastal tour.",
          destinations: "Cox's Bazar",
          duration_days: 3,
          duration_nights: 2,
          base_price: "12500.00",
          currency: "BDT",
        },
      ],
    });
    renderLanding();

    expect(await screen.findByText("Featured Escape")).toBeInTheDocument();
    const card = screen.getByTestId("package-card-pkg-feat-1");
    expect(card).toHaveAttribute("href", "/explore/pkg-feat-1");
    expect(
      within(card).getByTestId("package-card-price-pkg-feat-1"),
    ).toHaveTextContent("12,500.00 BDT");
    expect(
      within(card).getByTestId("package-card-price-pkg-feat-1").textContent,
    ).not.toMatch(/\$/);
    expect(listFeaturedPackagesMock).toHaveBeenCalledWith({ page: 1 });
  });

  it("shows generic error when results are missing or not an array", async () => {
    listFeaturedPackagesMock.mockResolvedValueOnce({ count: 1 });
    renderLanding();
    expect(await screen.findByTestId("landing-featured-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.landing.errors.generic,
    );
    expect(screen.queryByTestId("landing-featured-list")).not.toBeInTheDocument();

    cleanup();
    listFeaturedPackagesMock.mockResolvedValueOnce({
      count: 1,
      results: "not-an-array",
    });
    renderLanding();
    expect(await screen.findByTestId("landing-featured-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.landing.errors.generic,
    );
  });

  it("shows recoverable error with retry and Explore link", async () => {
    listFeaturedPackagesMock.mockRejectedValueOnce(
      new ApiError({
        status: 500,
        fieldErrors: {},
        nonFieldErrors: ["Featured load failed"],
        raw: null,
      }),
    );
    renderLanding();

    expect(await screen.findByTestId("landing-featured-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Featured load failed");
    expect(screen.getByTestId("landing-hero")).toBeInTheDocument();
    expect(screen.getByTestId("landing-featured-error-explore")).toHaveAttribute(
      "href",
      "/explore",
    );

    listFeaturedPackagesMock.mockResolvedValue({ count: 0, results: [] });
    await userEvent.click(screen.getByTestId("landing-featured-retry"));
    expect(
      await screen.findByTestId("landing-featured-empty"),
    ).toBeInTheDocument();
  });

  it("keeps hero usable while featured is loading", async () => {
    let resolveFeatured;
    listFeaturedPackagesMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFeatured = resolve;
        }),
    );
    renderLanding();

    expect(await screen.findByTestId("landing-hero")).toBeInTheDocument();
    expect(screen.getByTestId("landing-featured-loading")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByTestId("landing-hero-cta")).toHaveAttribute("href", "/explore");

    resolveFeatured({ count: 0, results: [] });
    expect(await screen.findByTestId("landing-featured-empty")).toBeInTheDocument();
  });
});
