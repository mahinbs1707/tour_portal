import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App.jsx";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { AuthProvider } from "../auth/AuthContext.jsx";
import {
  minBookableDateIso,
} from "../packages/packagesApi.js";
import {
  bookingDraftKey,
  loadBookingDraft,
  saveBookingDraft,
} from "./bookingDraft.js";
import {
  bookableDateOptions,
  validateBookingForm,
} from "./BookingFormPage.jsx";

const navigateMock = vi.fn();

const {
  ensureCsrfMock,
  meMock,
  getPublishedPackageMock,
  createBookingMock,
} = vi.hoisted(() => ({
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
  meMock: vi.fn(),
  getPublishedPackageMock: vi.fn(),
  createBookingMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
    getPublishedPackage: getPublishedPackageMock,
    listPublishedPackages: vi.fn().mockResolvedValue({ count: 0, results: [] }),
  };
});

vi.mock("./bookingsApi.js", () => ({
  createBooking: (...args) => createBookingMock(...args),
}));

const PKG_ID = "pkg-book-1";
const FAR_DATE = "2099-06-15";
const FAR_DATE_ID = "date-far";

function isoOffsetDays(days, asOf = new Date()) {
  const d = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const BOOKABLE_PKG = {
  id: PKG_ID,
  title: "Sundarbans Trail",
  short_description: "Mangrove adventure",
  is_bookable: true,
  unavailable_reason: null,
  available_dates: [
    { id: "date-near", tour_date: isoOffsetDays(3) },
    { id: FAR_DATE_ID, tour_date: FAR_DATE },
  ],
};

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

function customerMe() {
  meMock.mockResolvedValue({
    id: "u-customer",
    email: "customer@example.com",
    full_name: "Casey Customer",
    role: "CUSTOMER",
  });
}

function renderForm(path = `/app/bookings/new?package=${PKG_ID}`) {
  customerMe();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillRequiredFields(user, { skipDate = false } = {}) {
  if (!skipDate) {
    await user.selectOptions(
      screen.getByTestId("booking-form-date"),
      FAR_DATE_ID,
    );
  }
  await user.clear(screen.getByTestId("booking-form-travelers"));
  await user.type(screen.getByTestId("booking-form-travelers"), "2");
  const name = screen.getByTestId("booking-form-name");
  if (!name.value) {
    await user.type(name, "Casey Customer");
  }
  const email = screen.getByTestId("booking-form-email");
  if (!email.value) {
    await user.type(email, "customer@example.com");
  }
  await user.type(screen.getByTestId("booking-form-phone"), "+8801700000000");
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockMatchMedia(true);
  getPublishedPackageMock.mockResolvedValue(BOOKABLE_PKG);
  createBookingMock.mockResolvedValue({
    reference: "ABCDEF123456",
    status: "PENDING",
  });
  navigateMock.mockReset();
});

describe("bookableDateOptions / validateBookingForm", () => {
  it("excludes dates within the next 7 calendar days", () => {
    const asOf = new Date(2026, 10, 17);
    const options = bookableDateOptions(
      [
        { id: "a", tour_date: "2026-11-20" },
        { id: "b", tour_date: "2026-11-24" },
        { id: "c", tour_date: "2026-11-25" },
      ],
      asOf,
    );
    expect(minBookableDateIso(asOf)).toBe("2026-11-24");
    expect(options.map((row) => row.id)).toEqual(["b", "c"]);
  });

  it("blocks continue when required fields are missing", () => {
    const errors = validateBookingForm(
      {
        available_date_id: "",
        travelers: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        additional_requirements: "",
      },
      { bookableIds: new Set([FAR_DATE_ID]) },
    );
    expect(errors.available_date_id).toBe(messages.booking.errors.dateRequired);
    expect(errors.travelers).toBe(messages.booking.errors.travelersRequired);
    expect(errors.contact_name).toBe(messages.booking.errors.nameRequired);
    expect(errors.contact_email).toBe(messages.booking.errors.emailRequired);
    expect(errors.contact_phone).toBe(messages.booking.errors.phoneRequired);
  });
});

describe("BookingFormPage", () => {
  it("shows date helper and only offers dates outside the 7-day window", async () => {
    renderForm();
    const select = await screen.findByTestId("booking-form-date");
    expect(screen.getByTestId("booking-date-helper")).toHaveTextContent(
      minBookableDateIso(),
    );
    const optionValues = within(select)
      .getAllByRole("option")
      .map((opt) => opt.value)
      .filter(Boolean);
    expect(optionValues).toEqual([FAR_DATE_ID]);
    expect(optionValues).not.toContain("date-near");
  });

  it("blocks continue with field errors and does not call create API", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByTestId("booking-form");
    await user.click(screen.getByTestId("booking-form-continue"));

    expect(
      await screen.findByText(messages.booking.errors.dateRequired),
    ).toHaveAttribute("role", "alert");
    expect(
      screen.getByText(messages.booking.errors.phoneRequired),
    ).toBeInTheDocument();
    expect(createBookingMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("booking-review-page")).not.toBeInTheDocument();
  });

  it("maps backend 400 field errors after confirm and creates no success navigation", async () => {
    const user = userEvent.setup();
    createBookingMock.mockRejectedValue(
      new ApiError({
        status: 400,
        fieldErrors: {
          contact_phone: ["This field may not be blank."],
        },
        nonFieldErrors: [],
        raw: { contact_phone: ["This field may not be blank."] },
      }),
    );
    renderForm();
    await screen.findByTestId("booking-form");
    await fillRequiredFields(user);
    await user.click(screen.getByTestId("booking-form-continue"));
    expect(await screen.findByTestId("booking-review-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("booking-confirm-submit"));

    expect(
      await screen.findByText("This field may not be blank."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("booking-form-page")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("review confirm calls create API and navigates to thin confirmation", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByTestId("booking-form");
    await fillRequiredFields(user);
    await user.click(screen.getByTestId("booking-form-continue"));
    expect(await screen.findByTestId("booking-review-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("booking-confirm-submit"));

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalledWith({
        package_id: PKG_ID,
        available_date_id: FAR_DATE_ID,
        travelers: 2,
        contact_name: "Casey Customer",
        contact_email: "customer@example.com",
        contact_phone: "+8801700000000",
        additional_requirements: "",
      });
    });
    expect(navigateMock).toHaveBeenCalledWith(
      "/app/bookings/confirmation?reference=ABCDEF123456",
      { replace: true },
    );
    expect(loadBookingDraft(PKG_ID)).toBeNull();
  });

  it("autosaves draft to sessionStorage on edit", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByTestId("booking-form");
    await user.type(screen.getByTestId("booking-form-phone"), "+8801711111111");

    await waitFor(() => {
      expect(loadBookingDraft(PKG_ID)?.contact_phone).toBe("+8801711111111");
    });
    expect(sessionStorage.getItem(bookingDraftKey(PKG_ID))).toBeTruthy();
  });

  it("restores non-sensitive draft fields from sessionStorage after re-auth", async () => {
    saveBookingDraft(PKG_ID, {
      available_date_id: FAR_DATE_ID,
      travelers: "4",
      contact_name: "Draft Name",
      contact_email: "draft@example.com",
      contact_phone: "+8801999999999",
      additional_requirements: "Halal meals",
    });
    renderForm();
    expect(await screen.findByTestId("booking-form-date")).toHaveValue(
      FAR_DATE_ID,
    );
    expect(screen.getByTestId("booking-form-travelers")).toHaveValue(4);
    expect(screen.getByTestId("booking-form-name")).toHaveValue("Draft Name");
    expect(screen.getByTestId("booking-form-email")).toHaveValue(
      "draft@example.com",
    );
    expect(screen.getByTestId("booking-form-phone")).toHaveValue(
      "+8801999999999",
    );
    expect(screen.getByTestId("booking-form-requirements")).toHaveValue(
      "Halal meals",
    );
  });

  it("drops draft available_date_id that is no longer bookable", async () => {
    saveBookingDraft(PKG_ID, {
      available_date_id: "date-near",
      travelers: "2",
      contact_name: "Draft Name",
      contact_email: "draft@example.com",
      contact_phone: "+8801999999999",
    });
    renderForm();
    expect(await screen.findByTestId("booking-form-date")).toHaveValue("");
    expect(screen.getByTestId("booking-form-name")).toHaveValue("Draft Name");
  });

  it("shows unavailable messaging when package is not bookable", async () => {
    saveBookingDraft(PKG_ID, { contact_name: "Stale", travelers: "1" });
    getPublishedPackageMock.mockResolvedValue({
      ...BOOKABLE_PKG,
      is_bookable: false,
      unavailable_reason:
        "No qualifying travel dates are available for booking.",
      available_dates: [],
    });
    renderForm();
    expect(
      await screen.findByTestId("booking-form-unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.explore.bookingUnavailableNoDates)).toBeInTheDocument();
    expect(screen.queryByTestId("booking-form")).not.toBeInTheDocument();
    expect(loadBookingDraft(PKG_ID)).toBeNull();
  });

  it("shows Explore recovery link on not-found", async () => {
    getPublishedPackageMock.mockRejectedValue(
      new ApiError({
        status: 404,
        fieldErrors: {},
        nonFieldErrors: ["Not found."],
        raw: null,
      }),
    );
    saveBookingDraft(PKG_ID, { contact_name: "Gone" });
    renderForm();
    expect(
      await screen.findByTestId("booking-form-not-found-explore"),
    ).toHaveAttribute("href", "/explore");
    expect(loadBookingDraft(PKG_ID)).toBeNull();
  });

  it("shows Explore recovery link on load error", async () => {
    getPublishedPackageMock.mockRejectedValue(
      new ApiError({
        status: 500,
        fieldErrors: {},
        nonFieldErrors: ["Catalog unavailable."],
        raw: null,
      }),
    );
    renderForm();
    expect(
      await screen.findByTestId("booking-form-load-error-explore"),
    ).toHaveAttribute("href", "/explore");
  });
});
