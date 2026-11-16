import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import {
  PROMPT_MAX_LEN,
  fetchRecommendations,
  providerErrorMessage,
  validatePrompt,
} from "./recommendationsApi.js";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../../services/apiClient.js", () => ({
  apiRequest: apiRequestMock,
}));

describe("recommendationsApi", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ results: [] });
  });

  it("POSTs prompt to /api/recommendations/", async () => {
    await fetchRecommendations("beach weekend");
    expect(apiRequestMock).toHaveBeenCalledWith("/api/recommendations/", {
      method: "POST",
      body: JSON.stringify({ prompt: "beach weekend" }),
    });
  });

  it("validatePrompt trims and rejects blank or overlong", () => {
    expect(validatePrompt("  ", messages).ok).toBe(false);
    expect(validatePrompt("x".repeat(PROMPT_MAX_LEN + 1), messages).ok).toBe(
      false,
    );
    expect(validatePrompt("  beach  ", messages)).toEqual({
      ok: true,
      prompt: "beach",
    });
  });

  it("providerErrorMessage prefers nested string error.message", () => {
    expect(
      providerErrorMessage(
        {
          message: "[object Object]",
          raw: { error: { code: "provider_unavailable", message: "Down" } },
        },
        "fallback",
      ),
    ).toBe("Down");
    expect(
      providerErrorMessage(
        {
          message: "[object Object]",
          raw: { error: { code: "x", message: { nested: true } } },
        },
        "fallback",
      ),
    ).toBe("fallback");
    expect(providerErrorMessage({ message: "plain" }, "fallback")).toBe("plain");
    expect(providerErrorMessage({}, "fallback")).toBe("fallback");
  });
});
