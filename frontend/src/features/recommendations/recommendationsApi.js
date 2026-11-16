import { apiRequest } from "../../services/apiClient.js";

/** Match Story 4.1 prompt max length (trim; reject blank). */
export const PROMPT_MAX_LEN = 2000;

/**
 * POST /api/recommendations/ — public AllowAny + CSRF (Story 4.1 / 4.2).
 * @param {string} prompt trimmed preference text
 * @returns {Promise<{ results: object[] }>}
 */
export function fetchRecommendations(prompt) {
  return apiRequest("/api/recommendations/", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

/**
 * Client-side prompt rules mirroring 4.1 (before POST).
 * @returns {{ ok: true, prompt: string } | { ok: false, message: string }}
 */
export function validatePrompt(raw, messages) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, message: messages.ai.errors.promptRequired };
  }
  if (text.length > PROMPT_MAX_LEN) {
    return {
      ok: false,
      message: messages.ai.errors.promptTooLong.replace(
        "{max}",
        String(PROMPT_MAX_LEN),
      ),
    };
  }
  return { ok: true, prompt: text };
}

/**
 * Prefer provider envelope message from 502/503 `{ error: { code, message } }`.
 */
export function providerErrorMessage(err, fallback) {
  const nested = err?.raw?.error;
  if (
    nested &&
    typeof nested === "object" &&
    typeof nested.message === "string"
  ) {
    return nested.message;
  }
  if (typeof err?.message === "string" && err.message && err.message !== "[object Object]") {
    return err.message;
  }
  return fallback;
}
