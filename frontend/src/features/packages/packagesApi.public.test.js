import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

import {
  PACKAGE_LIST_PAGE_SIZE,
  formatPackagePrice,
  listPublishedPackages,
} from "./packagesApi.js";

beforeEach(() => {
  apiRequestMock.mockResolvedValue({ count: 0, results: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("packagesApi public catalog helpers", () => {
  it("exposes shared page size constant of 20", () => {
    expect(PACKAGE_LIST_PAGE_SIZE).toBe(20);
  });

  it("listPublishedPackages omits page 1 query", async () => {
    await listPublishedPackages({ page: 1 });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/", {
      method: "GET",
    });
  });

  it("listPublishedPackages includes page 2", async () => {
    await listPublishedPackages({ page: 2 });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/?page=2", {
      method: "GET",
    });
  });

  it("listPublishedPackages accepts a legacy page number", async () => {
    await listPublishedPackages(3);
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/?page=3", {
      method: "GET",
    });
  });

  it("listPublishedPackages coerces invalid page values to 1", async () => {
    for (const page of [0, -2, 1.5, "nope", null, undefined, NaN]) {
      apiRequestMock.mockClear();
      await listPublishedPackages({ page });
      expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/", {
        method: "GET",
      });
    }
  });

  it("formatPackagePrice stays amount CODE without dollar sign", () => {
    expect(formatPackagePrice("12500.00", "bdt")).toBe("12,500.00 BDT");
    expect(formatPackagePrice("12500.00", "bdt")).not.toMatch(/\$/);
  });
});
