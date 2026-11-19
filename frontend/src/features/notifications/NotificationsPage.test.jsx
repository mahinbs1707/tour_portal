import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { NotificationsPage } from "./NotificationsPage.jsx";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("./notificationsApi.js", () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("./unreadEvents.js", () => ({
  dispatchUnreadCountInvalidate: vi.fn(),
}));

import { listNotifications, markNotificationRead } from "./notificationsApi.js";
import { dispatchUnreadCountInvalidate } from "./unreadEvents.js";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/customer/notifications"]}>
      <Routes>
        <Route
          path="/app/customer/notifications"
          element={<NotificationsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows caught-up empty state", async () => {
    listNotifications.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(messages.notifications.emptyCaughtUp),
    ).toBeInTheDocument();
  });

  it("marks unread item read and navigates on open", async () => {
    const user = userEvent.setup();
    listNotifications.mockResolvedValue([
      {
        id: "n-1",
        message: "Booking BR-1 was submitted.",
        is_read: false,
        created_at: "2026-11-19T00:00:00Z",
        deeplink: "/app/customer/bookings/b-1",
      },
    ]);
    markNotificationRead.mockResolvedValue({ id: "n-1", is_read: true });
    renderPage();
    await user.click(await screen.findByTestId("notification-item-n-1"));
    expect(markNotificationRead).toHaveBeenCalledWith("n-1");
    expect(dispatchUnreadCountInvalidate).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/app/customer/bookings/b-1");
  });

  it("refreshes nav badge when mark-read has no deeplink", async () => {
    const user = userEvent.setup();
    listNotifications.mockResolvedValue([
      {
        id: "n-2",
        message: "System notice.",
        is_read: false,
        created_at: "2026-11-19T00:00:00Z",
        deeplink: null,
      },
    ]);
    markNotificationRead.mockResolvedValue({ id: "n-2", is_read: true });
    renderPage();
    await user.click(await screen.findByTestId("notification-item-n-2"));
    expect(dispatchUnreadCountInvalidate).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});