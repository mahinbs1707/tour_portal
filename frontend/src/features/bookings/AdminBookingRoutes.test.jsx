import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "../auth/AuthContext.jsx";

const { ensureCsrfMock, meMock, listMock, getMock } = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  listMock: vi.fn(),
  getMock: vi.fn(),
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

vi.mock("./adminBookingsApi.js", () => ({
  listAdminBookings: (...args) => listMock(...args),
  getAdminBooking: (...args) => getMock(...args),
  approveAdminBooking: vi.fn(),
  rejectAdminBooking: vi.fn(),
}));

vi.mock("./bookingsApi.js", () => ({
  createBooking: vi.fn(),
  listMyBookings: vi.fn().mockResolvedValue([]),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));

const adminUser = {
  id: "a1",
  email: "admin@example.com",
  role: "ADMIN",
  is_staff: true,
  is_superuser: true,
};

const customerUser = {
  id: "c1",
  email: "customer@example.com",
  role: "CUSTOMER",
  is_staff: false,
  is_superuser: false,
};

const BOOKING = {
  id: "b-1",
  reference: "ABCDEF123456",
  status: "PENDING",
  package_title: "Cox's Bazar Escape",
  tour_date: "2099-06-15",
  travelers: 2,
  contact_name: "Contact Person",
  contact_email: "contact@example.com",
  contact_phone: "+8801700000000",
  additional_requirements: "",
  payment_status: "UNPAID",
  payment_window_status: "NOT_OPEN",
  created_at: "2099-01-01T06:00:00Z",
  customer_full_name: "Casey Customer",
  customer_email: "casey@example.com",
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
  return <div data-testid="location-echo">{`${pathname}${search}${hash}`}</div>;
}

function renderApp(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <LocationEcho />
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Admin bookings routes via AppRoutes", () => {
  beforeEach(() => {
    meMock.mockReset();
    meMock.mockResolvedValue(adminUser);
    listMock.mockReset();
    listMock.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [BOOKING],
    });
    getMock.mockReset();
    getMock.mockResolvedValue(BOOKING);
    ensureCsrfMock.mockResolvedValue(undefined);
    mockMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts the list at /app/admin/bookings for an Admin", async () => {
    renderApp("/app/admin/bookings");
    expect(await screen.findByTestId("admin-bookings-page")).toBeInTheDocument();
    expect(await screen.findByTestId("admin-booking-card-b-1")).toBeInTheDocument();
  });

  it("mounts the detail at /app/admin/bookings/:id (UUID key) for an Admin", async () => {
    renderApp("/app/admin/bookings/b-1");
    expect(
      await screen.findByTestId("admin-booking-detail-reference"),
    ).toHaveTextContent("ABCDEF123456");
    expect(getMock).toHaveBeenCalledWith("b-1");
  });

  it("redirects a Guest to sign-in and never calls the list API", async () => {
    meMock.mockRejectedValue(
      Object.assign(new Error("Authentication credentials were not provided."), {
        name: "ApiError",
        status: 401,
        fieldErrors: {},
        nonFieldErrors: ["Authentication credentials were not provided."],
      }),
    );
    renderApp("/app/admin/bookings");
    expect(
      await screen.findByRole("heading", { name: messages.auth.signInTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location-echo")).toHaveTextContent(
      `/sign-in?next=${encodeURIComponent("/app/admin/bookings")}`,
    );
    expect(screen.queryByTestId("admin-bookings-page")).toBeNull();
    expect(listMock).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();
  });

  it("does not expose Admin bookings to a Customer", async () => {
    meMock.mockResolvedValue(customerUser);
    renderApp("/app/admin/bookings");
    expect(
      await screen.findByRole("heading", { name: messages.customerHome.title }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-bookings-page")).toBeNull();
    expect(listMock).not.toHaveBeenCalled();
  });
});
