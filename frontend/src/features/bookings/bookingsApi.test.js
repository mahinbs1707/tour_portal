import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

import {
  cancelBooking,
  createBooking,
  findActiveBookingForPackage,
  getBooking,
  listMyBookings,
  submitPaymentAttempt,
} from "./bookingsApi.js";

describe("bookingsApi", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      reference: "ABCDEF123456",
      status: "PENDING",
    });
  });

  it("POSTs /api/bookings/ with the Story 5.1 JSON shape", async () => {
    const payload = {
      package_id: "pkg-1",
      available_date_id: "date-1",
      travelers: 2,
      contact_name: "Casey Customer",
      contact_email: "casey@example.com",
      contact_phone: "+8801700000000",
      additional_requirements: "Vegetarian meals",
    };

    await createBooking(payload);

    expect(apiRequestMock).toHaveBeenCalledWith("/api/bookings/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("GETs the own-booking list", async () => {
    await listMyBookings();
    expect(apiRequestMock).toHaveBeenCalledWith("/api/bookings/", {
      method: "GET",
    });
  });

  it("GETs detail by booking UUID", async () => {
    await getBooking("11111111-2222-3333-4444-555555555555");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/11111111-2222-3333-4444-555555555555/",
      { method: "GET" },
    );
  });

  it("POSTs cancel by booking UUID", async () => {
    await cancelBooking("11111111-2222-3333-4444-555555555555");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/11111111-2222-3333-4444-555555555555/cancel/",
      { method: "POST" },
    );
  });

  it("POSTs payment attempt with outcome body", async () => {
    await submitPaymentAttempt("11111111-2222-3333-4444-555555555555", "SUCCESS");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/11111111-2222-3333-4444-555555555555/payments/attempt/",
      {
        method: "POST",
        body: JSON.stringify({ outcome: "SUCCESS" }),
      },
    );
  });

  it("finds the active booking for a package and ignores cancelled/rejected", () => {
    const bookings = [
      { id: "b1", package_id: "pkg-1", status: "CANCELLED" },
      { id: "b2", package_id: "pkg-1", status: "PENDING" },
      { id: "b3", package_id: "pkg-2", status: "APPROVED" },
      { id: "b4", package_id: "pkg-3", status: "REJECTED" },
    ];
    expect(findActiveBookingForPackage(bookings, "pkg-1")?.id).toBe("b2");
    expect(findActiveBookingForPackage(bookings, "pkg-2")?.id).toBe("b3");
    expect(findActiveBookingForPackage(bookings, "pkg-3")).toBeNull();
    expect(findActiveBookingForPackage(bookings, "pkg-missing")).toBeNull();
  });
});
