import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

import {
  featureAdminPackage,
  listAdminPackages,
  unfeatureAdminPackage,
} from "./packagesApi.js";

beforeEach(() => {
  apiRequestMock.mockResolvedValue({ id: "pkg-1" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("packagesApi featured/list helpers request shape", () => {
  it("listAdminPackages builds query for page, status, and featured", async () => {
    await listAdminPackages({
      page: 2,
      status: "PUBLISHED",
      featured: "true",
    });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/?page=2&status=PUBLISHED&featured=true",
      { method: "GET" },
    );
  });

  it("listAdminPackages omits empty filters and page 1", async () => {
    await listAdminPackages({ page: 1 });
    expect(apiRequestMock).toHaveBeenCalledWith("/api/packages/admin/", {
      method: "GET",
    });
  });

  it("listAdminPackages accepts boolean featured", async () => {
    await listAdminPackages({ featured: false });
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/?featured=false",
      { method: "GET" },
    );
  });

  it("featureAdminPackage posts to feature URL", async () => {
    await featureAdminPackage("pkg-1");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/pkg-1/feature/",
      { method: "POST", body: JSON.stringify({}) },
    );
  });

  it("unfeatureAdminPackage posts to unfeature URL", async () => {
    await unfeatureAdminPackage("pkg-9");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/pkg-9/unfeature/",
      { method: "POST", body: JSON.stringify({}) },
    );
  });
});
