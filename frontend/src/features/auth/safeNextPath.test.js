import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeNextPath.js";

describe("safeNextPath", () => {
  it("allows same-origin relative paths and preserves hash", () => {
    expect(safeNextPath("/app/customer")).toBe("/app/customer");
    expect(safeNextPath("/app/admin?tab=1")).toBe("/app/admin?tab=1");
    expect(safeNextPath("/explore#featured")).toBe("/explore#featured");
    expect(safeNextPath("/app/customer/bookings#top")).toBe(
      "/app/customer/bookings#top",
    );
  });

  it("rejects protocol-relative, absolute, and backslash shapes", () => {
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("/\\evil")).toBeNull();
    expect(safeNextPath("/foo\\bar")).toBeNull();
    expect(safeNextPath("/%5cevil")).toBeNull();
    expect(safeNextPath("/%5Cevil")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
