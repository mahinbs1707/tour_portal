import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "./AuthContext.jsx";

const { ensureCsrfMock, meMock } = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
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

const customerUser = {
  id: "c1",
  email: "customer@example.com",
  role: "CUSTOMER",
  is_staff: false,
  is_superuser: false,
};

const adminUser = {
  id: "a1",
  email: "admin@example.com",
  role: "ADMIN",
  is_staff: true,
  is_superuser: true,
};

function mockMatchMedia(matches) {
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

function LocationEcho() {
  const { pathname, search, hash } = useLocation();
  return (
    <div data-testid="location-echo">{`${pathname}${search}${hash}`}</div>
  );
}

function renderApp(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <LocationEcho />
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
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

describe("Story 1.6 role-aware nav and route guards", () => {
  beforeEach(() => {
    meMock.mockReset();
    ensureCsrfMock.mockResolvedValue(undefined);
    mockMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  it("Guest primary nav shows Explore, AI, Sign in, Sign up only", async () => {
    guestMeReject();
    renderApp("/");

    const nav = await screen.findByRole("navigation", {
      name: messages.a11y.mainNav,
    });
    expect(
      within(nav).getByRole("link", { name: messages.nav.explore }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.ai }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.signIn }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.signUp }),
    ).toBeInTheDocument();

    expect(
      within(nav).queryByRole("link", { name: messages.nav.myBookings }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.customTours }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.notifications }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.signOut }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.packages }),
    ).not.toBeInTheDocument();
  });

  it("Customer primary nav includes Customer-only items and Sign out", async () => {
    meMock.mockResolvedValue(customerUser);
    renderApp("/");

    const nav = await screen.findByRole("navigation", {
      name: messages.a11y.mainNav,
    });
    await waitFor(() => {
      expect(
        within(nav).getByRole("link", { name: messages.nav.myBookings }),
      ).toBeInTheDocument();
    });
    expect(
      within(nav).getByRole("link", { name: messages.nav.explore }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.ai }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.customTours }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.notifications }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: messages.nav.signOut }),
    ).toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.signIn }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.signUp }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: messages.nav.packages }),
    ).not.toBeInTheDocument();
  });

  it("Admin shell uses sidebar; public TopNav has Home to /app/admin and no ops links", async () => {
    meMock.mockResolvedValue(adminUser);
    const { unmount } = renderApp("/app/admin");

    expect(
      await screen.findByRole("heading", { name: messages.adminHome.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: messages.a11y.adminNav }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.nav.packages }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.nav.viewSite }),
    ).toBeInTheDocument();

    unmount();
    renderApp("/");
    const publicNav = await screen.findByRole("navigation", {
      name: messages.a11y.mainNav,
    });
    await waitFor(() => {
      expect(
        within(publicNav).getByRole("link", { name: messages.nav.signOut }),
      ).toBeInTheDocument();
    });
    expect(
      within(publicNav).getByRole("link", { name: messages.nav.home }),
    ).toHaveAttribute("href", "/app/admin");
    expect(
      within(publicNav).queryByRole("link", { name: messages.nav.packages }),
    ).not.toBeInTheDocument();
    expect(
      within(publicNav).queryByRole("link", { name: messages.nav.myBookings }),
    ).not.toBeInTheDocument();
  });

  it("Customer opening /app/admin redirects to Customer home with status toast", async () => {
    meMock.mockResolvedValue(customerUser);
    renderApp("/app/admin/packages");

    expect(
      await screen.findByRole("heading", { name: messages.customerHome.title }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent(messages.auth.permissionDenied);
  });

  it("Guest opening /app/admin redirects to Sign in with next", async () => {
    guestMeReject();
    renderApp("/app/admin");

    expect(
      await screen.findByRole("heading", { name: messages.auth.signInTitle }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.email)).toBeInTheDocument();
    expect(screen.getByTestId("location-echo")).toHaveTextContent(
      `/sign-in?next=${encodeURIComponent("/app/admin")}`,
    );
  });

  it("Guest opening /app/customer redirects to Sign in with next", async () => {
    guestMeReject();
    renderApp("/app/customer");

    expect(
      await screen.findByRole("heading", { name: messages.auth.signInTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location-echo")).toHaveTextContent(
      `/sign-in?next=${encodeURIComponent("/app/customer")}`,
    );
  });

  it("Admin opening /app/customer redirects to Admin home", async () => {
    meMock.mockResolvedValue(adminUser);
    renderApp("/app/customer/bookings");

    expect(
      await screen.findByRole("heading", { name: messages.adminHome.title }),
    ).toBeInTheDocument();
  });

  it("never gates Admin routes on is_staff alone (role=CUSTOMER + is_staff still denied)", async () => {
    meMock.mockResolvedValue({
      ...customerUser,
      is_staff: true,
    });
    renderApp("/app/admin");

    expect(
      await screen.findByRole("heading", { name: messages.customerHome.title }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent(messages.auth.permissionDenied);
  });

  it("Admin sheet navigation still works when authorized", async () => {
    mockMatchMedia(false);
    meMock.mockResolvedValue(adminUser);
    const user = userEvent.setup();
    renderApp("/app/admin");

    await user.click(
      await screen.findByRole("button", { name: messages.a11y.openAdminNav }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("navigation", { name: messages.a11y.adminNav }),
    ).toBeInTheDocument();
  });
});
