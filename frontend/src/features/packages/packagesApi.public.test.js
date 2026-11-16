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
  getPublishedPackage,
  listFeaturedPackages,
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

  it("listPublishedPackages includes featured=true", async () => {
    await listPublishedPackages({ featured: true });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/?featured=true",
      { method: "GET" },
    );
  });

  it("listPublishedPackages normalizes featured string case", async () => {
    await listPublishedPackages({ featured: "TRUE" });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/?featured=true",
      { method: "GET" },
    );
    apiRequestMock.mockClear();
    await listPublishedPackages({ featured: "False" });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/?featured=false",
      { method: "GET" },
    );
  });

  it("listPublishedPackages omits non-canonical featured values", async () => {
    await listPublishedPackages({ featured: "maybe" });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/", {
      method: "GET",
    });
  });

  it("listPublishedPackages includes featured=false and page", async () => {
    await listPublishedPackages({ page: 2, featured: false });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/?page=2&featured=false",
      { method: "GET" },
    );
  });

  it("listPublishedPackages includes search and filter params", async () => {
    await listPublishedPackages({
      page: 2,
      q: "tea",
      destination: "Sylhet",
      min_price: "10000",
      max_price: "15000",
      duration_days: "3",
    });
    const calledUrl = apiRequestMock.mock.calls[0][0];
    expect(calledUrl.startsWith("/api/packages/?")).toBe(true);
    const query = new URLSearchParams(calledUrl.split("?")[1]);
    expect(query.get("page")).toBe("2");
    expect(query.get("q")).toBe("tea");
    expect(query.get("destination")).toBe("Sylhet");
    expect(query.get("min_price")).toBe("10000");
    expect(query.get("max_price")).toBe("15000");
    expect(query.get("duration_days")).toBe("3");
  });

  it("listPublishedPackages omits blank search and filter values", async () => {
    await listPublishedPackages({
      q: "  ",
      destination: "",
      min_price: null,
      max_price: undefined,
      duration_days: "  ",
    });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/", {
      method: "GET",
    });
  });

  it("listFeaturedPackages always requests featured=true", async () => {
    await listFeaturedPackages({ page: 1 });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/?featured=true",
      { method: "GET" },
    );
  });

  it("formatPackagePrice stays amount CODE without dollar sign", () => {
    expect(formatPackagePrice("12500.00", "bdt")).toBe("12,500.00 BDT");
    expect(formatPackagePrice("12500.00", "bdt")).not.toMatch(/\$/);
  });

  it("getPublishedPackage requests public detail by id", async () => {
    await getPublishedPackage("pkg-abc");
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/pkg-abc/", {
      method: "GET",
    });
  });

  it("getPublishedPackage rejects null or empty id without fetching", async () => {
    for (const id of [null, undefined, "", "   "]) {
      apiRequestMock.mockClear();
      await expect(getPublishedPackage(id)).rejects.toThrow(
        "Package id is required.",
      );
      expect(apiRequestMock).not.toHaveBeenCalled();
    }
  });
});
