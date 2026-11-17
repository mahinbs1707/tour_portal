import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

import { createBooking } from "./bookingsApi.js";

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
});
