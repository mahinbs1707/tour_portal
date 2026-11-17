import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: (...args) => apiRequestMock(...args),
}));

import {
  approveAdminBooking,
  getAdminBooking,
  listAdminBookings,
} from "./adminBookingsApi.js";

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockResolvedValue({});
});

describe("adminBookingsApi", () => {
  it("lists with no query by default (All, page 1)", async () => {
    await listAdminBookings();
    expect(apiRequestMock).toHaveBeenCalledWith("/api/bookings/admin/", {
      method: "GET",
    });
  });

  it("adds status and page params only when meaningful", async () => {
    await listAdminBookings({ page: 2, status: "PENDING" });
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      "/api/bookings/admin/?page=2&status=PENDING",
      { method: "GET" },
    );
    await listAdminBookings({ page: 1, status: "" });
    expect(apiRequestMock).toHaveBeenLastCalledWith("/api/bookings/admin/", {
      method: "GET",
    });
  });

  it("approves by UUID id with POST (CSRF handled by apiRequest)", async () => {
    await approveAdminBooking("abc-123");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/admin/abc-123/approve/",
      { method: "POST" },
    );
  });

  it("fetches detail by UUID id", async () => {
    await getAdminBooking("abc-123");
    expect(apiRequestMock).toHaveBeenCalledWith("/api/bookings/admin/abc-123/", {
      method: "GET",
    });
  });
});
