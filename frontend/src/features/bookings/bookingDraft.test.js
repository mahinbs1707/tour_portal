import { afterEach, describe, expect, it } from "vitest";
import {
  bookingDraftKey,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "./bookingDraft.js";

afterEach(() => {
  sessionStorage.clear();
});

describe("bookingDraft", () => {
  it("persists and restores only non-sensitive fields by package id", () => {
    saveBookingDraft("pkg-1", {
      available_date_id: "d1",
      travelers: "3",
      contact_name: "Casey",
      contact_email: "casey@example.com",
      contact_phone: "+8801700000000",
      additional_requirements: "Window seat",
      password: "secret",
    });

    const raw = JSON.parse(sessionStorage.getItem(bookingDraftKey("pkg-1")));
    expect(raw.password).toBeUndefined();
    expect(loadBookingDraft("pkg-1")).toEqual({
      available_date_id: "d1",
      travelers: "3",
      contact_name: "Casey",
      contact_email: "casey@example.com",
      contact_phone: "+8801700000000",
      additional_requirements: "Window seat",
    });
    expect(loadBookingDraft("pkg-other")).toBeNull();
  });

  it("clears a draft after successful submit", () => {
    saveBookingDraft("pkg-1", { contact_name: "Casey", travelers: "1" });
    clearBookingDraft("pkg-1");
    expect(loadBookingDraft("pkg-1")).toBeNull();
  });
});
