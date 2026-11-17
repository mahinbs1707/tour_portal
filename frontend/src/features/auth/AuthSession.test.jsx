import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { PublicLayout } from "../../layouts/PublicLayout.jsx";
import {
  AuthProvider,
  draftRestoreStub,
  useAuth,
} from "./AuthContext.jsx";
import { SessionExpiredModal } from "./SessionExpiredModal.jsx";
import { SignOutPage } from "./SignOutPage.jsx";

const { ensureCsrfMock, meMock, logoutMock } = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  logoutMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/apiClient.js", async () => {
  const actual = await vi.importActual("../../services/apiClient.js");
  return {
    ...actual,
    ensureCsrf: ensureCsrfMock,
    me: meMock,
    logout: logoutMock,
    login: vi.fn(),
  };
});

import { ApiError, apiRequest } from "../../services/apiClient.js";

function GuestProbe() {
  const { isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? "signed-in" : "guest"}</p>;
}

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

describe("Auth session bootstrap and chrome", () => {
  beforeEach(() => {
    meMock.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(null);
    ensureCsrfMock.mockResolvedValue(undefined);
    draftRestoreStub.current = () => {};
    mockMatchMedia(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("bootstraps signed-in user via CSRF + me", async () => {
    meMock.mockResolvedValue({
      id: "1",
      email: "alex@example.com",
      role: "CUSTOMER",
      is_staff: false,
      is_superuser: false,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <GuestProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("signed-in")).toBeInTheDocument();
    expect(ensureCsrfMock).toHaveBeenCalled();
    expect(meMock).toHaveBeenCalled();
  });

  it("signed-in TopNav shows Sign out not Sign in/up; Guest chrome after sign-out", async () => {
    meMock.mockResolvedValue({
      id: "1",
      email: "alex@example.com",
      role: "CUSTOMER",
      is_staff: false,
      is_superuser: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<GuestProbe />} />
              <Route path="sign-out" element={<SignOutPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("signed-in")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.nav.signOut }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.nav.signIn }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.nav.signUp }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("link", { name: messages.nav.signOut }),
    );

    expect(await screen.findByText("guest")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: messages.nav.signIn }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.nav.signUp }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.nav.signOut }),
    ).not.toBeInTheDocument();
    expect(logoutMock).toHaveBeenCalled();
  });

  it("sign out clears session and returns guest", async () => {
    meMock.mockResolvedValue({
      id: "1",
      email: "alex@example.com",
      role: "CUSTOMER",
      is_staff: false,
      is_superuser: false,
    });

    render(
      <MemoryRouter initialEntries={["/sign-out"]}>
        <AuthProvider>
          <Routes>
            <Route path="/sign-out" element={<SignOutPage />} />
            <Route path="/" element={<GuestProbe />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("guest")).toBeInTheDocument();
    expect(logoutMock).toHaveBeenCalled();
  });

  it("shows session-ended modal on 401 and invokes draft restore", async () => {
    const restoreSpy = vi.fn();
    draftRestoreStub.current = restoreSpy;

    meMock.mockRejectedValue(
      new ApiError({
        status: 401,
        fieldErrors: {},
        nonFieldErrors: ["Authentication credentials were not provided."],
        raw: null,
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        detail: "Authentication credentials were not provided.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "csrftoken=tok; path=/";

    const user = userEvent.setup();
    const bookingPath = "/app/bookings/new?package=pkg-1";
    render(
      <MemoryRouter initialEntries={[bookingPath]}>
        <AuthProvider>
          <SessionExpiredModal />
          <button
            type="button"
            onClick={() =>
              apiRequest("/api/protected/", {
                method: "POST",
                body: "{}",
              }).catch(() => {})
            }
          >
            mutate
          </button>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(meMock).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "mutate" }));

    expect(
      await screen.findByRole("dialog", {
        name: messages.auth.sessionEndedTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.nav.signIn }),
    ).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent(bookingPath)}`,
    );
    expect(restoreSpy).toHaveBeenCalledTimes(1);
  });
});
