import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App.jsx";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import { messages } from "./i18n/messages.js";

const { ensureCsrfMock, meMock, logoutMock } = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn().mockRejectedValue(
    Object.assign(new Error("Authentication credentials were not provided."), {
      name: "ApiError",
      status: 401,
      fieldErrors: {},
      nonFieldErrors: ["Authentication credentials were not provided."],
    }),
  ),
  logoutMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("./services/apiClient.js", async () => {
  const actual = await vi.importActual("./services/apiClient.js");
  return {
    ...actual,
    ensureCsrf: ensureCsrfMock,
    me: meMock,
    logout: logoutMock,
    setSessionEndedHandler: vi.fn(),
  };
});

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

function renderApp(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("router shell", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders skip link and header/nav/main landmarks on /", async () => {
    renderApp("/");

    expect(
      await screen.findByRole("link", { name: messages.a11y.skipToMain }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: messages.a11y.mainNav }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("opens AdminLayout sheet navigation", async () => {
    const user = userEvent.setup();

    renderApp("/app/admin");

    await user.click(
      screen.getByRole("button", { name: messages.a11y.openAdminNav }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("navigation", { name: messages.a11y.adminNav }),
    ).toBeInTheDocument();
  });

  it("renders Sign up page form at /sign-up", async () => {
    renderApp("/sign-up");

    expect(
      await screen.findByRole("heading", { name: messages.auth.signUpTitle }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.fullName)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.email)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.password)).toBeInTheDocument();
    expect(
      screen.getByLabelText(messages.auth.confirmPassword),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    ).toBeInTheDocument();
  });

  it("renders Sign in page form at /sign-in", async () => {
    renderApp("/sign-in");

    expect(
      await screen.findByRole("heading", { name: messages.auth.signInTitle }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.email)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.password)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.auth.submitSignIn }),
    ).toBeInTheDocument();
  });

  it("wires /sign-out to SignOutPage", async () => {
    renderApp("/sign-out");

    expect(
      await screen.findByText(messages.auth.signingOut),
    ).toBeInTheDocument();
    await screen.findByRole("link", { name: messages.nav.signIn });
    expect(logoutMock).toHaveBeenCalled();
  });
});
