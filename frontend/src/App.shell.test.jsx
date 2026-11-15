import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App.jsx";
import { messages } from "./i18n/messages.js";

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

describe("router shell", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders skip link and header/nav/main landmarks on /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: messages.a11y.skipToMain }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: messages.a11y.mainNav }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("opens AdminLayout sheet navigation", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/app/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: messages.a11y.openAdminNav }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("navigation", { name: messages.a11y.adminNav }),
    ).toBeInTheDocument();
  });
});
