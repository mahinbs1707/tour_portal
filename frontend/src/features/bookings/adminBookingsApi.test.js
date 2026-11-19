import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: (...args) => apiRequestMock(...args),
}));

import {
  approveAdminBooking,
  extendAdminPaymentWindow,
  getAdminBooking,
  listAdminBookings,
  reopenAdminPaymentWindow,
  rejectAdminBooking,
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

  it("rejects by UUID id with POST and a JSON rejection_reason body", async () => {
    await rejectAdminBooking("abc-123", "No capacity.");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/admin/abc-123/reject/",
      {
        method: "POST",
        body: JSON.stringify({ rejection_reason: "No capacity." }),
      },
    );
  });

  it("fetches detail by UUID id", async () => {
    await getAdminBooking("abc-123");
    expect(apiRequestMock).toHaveBeenCalledWith("/api/bookings/admin/abc-123/", {
      method: "GET",
    });
  });

  it("reopens payment window with POST", async () => {
    await reopenAdminPaymentWindow("abc-123");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/admin/abc-123/reopen/",
      { method: "POST" },
    );
  });

  it("extends payment window with POST and deadline_at body", async () => {
    await extendAdminPaymentWindow("abc-123", "2099-12-01T00:00:00.000Z");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/bookings/admin/abc-123/extend/",
      {
        method: "POST",
        body: JSON.stringify({ deadline_at: "2099-12-01T00:00:00.000Z" }),
      },
    );
  });
});
