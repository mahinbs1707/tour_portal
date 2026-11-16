import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

import {
  clearAdminPackageCover,
  removeAdminPackageAdditional,
  uploadAdminPackageAdditional,
  uploadAdminPackageCover,
} from "./packagesApi.js";

beforeEach(() => {
  apiRequestMock.mockResolvedValue({ id: "pkg-1" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("packagesApi media helpers request shape", () => {
  it("uploadAdminPackageCover posts FormData file to cover URL", async () => {
    const file = new File([new Uint8Array([1])], "c.jpg", { type: "image/jpeg" });
    await uploadAdminPackageCover("pkg-1", file);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const [url, options] = apiRequestMock.mock.calls[0];
    expect(url).toBe("/api/packages/admin/pkg-1/media/cover/");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("file")).toBe(file);
  });

  it("clearAdminPackageCover deletes cover URL", async () => {
    await clearAdminPackageCover("pkg-1");
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/pkg-1/media/cover/",
      { method: "DELETE" },
    );
  });

  it("uploadAdminPackageAdditional posts FormData file to additional URL", async () => {
    const file = new File([new Uint8Array([2])], "a.png", { type: "image/png" });
    await uploadAdminPackageAdditional("pkg-2", file);
    const [url, options] = apiRequestMock.mock.calls[0];
    expect(url).toBe("/api/packages/admin/pkg-2/media/additional/");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("file")).toBe(file);
  });

  it("removeAdminPackageAdditional deletes index URL", async () => {
    await removeAdminPackageAdditional("pkg-1", 3);
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/packages/admin/pkg-1/media/additional/3/",
      { method: "DELETE" },
    );
  });
});
