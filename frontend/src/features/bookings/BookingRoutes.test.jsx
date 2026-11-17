import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
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

vi.mock("./bookingsApi.js", () => ({
  createBooking: vi.fn(),
  listMyBookings: (...args) => listMock(...args),
  getBooking: (...args) => getMock(...args),
  cancelBooking: vi.fn(),
}));

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
  contact_name: "Casey",
  contact_email: "casey@example.com",
  contact_phone: "+8801700000000",
  additional_requirements: "",
  payment_status: "UNPAID",
  payment_window_status: "NOT_OPEN",
  created_at: "2099-01-01T06:00:00Z",
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

function renderApp(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Customer booking history routes via AppRoutes", () => {
  beforeEach(() => {
    meMock.mockReset();
    meMock.mockResolvedValue(customerUser);
    listMock.mockReset();
    listMock.mockResolvedValue([BOOKING]);
    getMock.mockReset();
    getMock.mockResolvedValue(BOOKING);
    ensureCsrfMock.mockResolvedValue(undefined);
    mockMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts the history page at /app/customer/bookings for a Customer", async () => {
    renderApp("/app/customer/bookings");
    expect(await screen.findByTestId("my-bookings-page")).toBeInTheDocument();
    expect(await screen.findByTestId("my-booking-card-b-1")).toBeInTheDocument();
  });

  it("mounts the detail page at /app/customer/bookings/:id for a Customer", async () => {
    renderApp("/app/customer/bookings/b-1");
    expect(await screen.findByTestId("booking-detail-page")).toBeInTheDocument();
    expect(await screen.findByTestId("booking-detail-reference")).toHaveTextContent(
      "ABCDEF123456",
    );
    expect(getMock).toHaveBeenCalledWith("b-1");
  });
});
