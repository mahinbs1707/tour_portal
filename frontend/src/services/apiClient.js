/**
 * Shared HTTP client (AD-21 — Stories 1.4–1.5).
 * Exactly one client: credentials include, CSRF attach, DRF normalization,
 * 401 → session-ended handler, optional single CSRF refresh on 403.
 */

const CSRF_COOKIE = "csrftoken";
const CSRF_HEADER = "X-CSRFToken";

function readCookie(name) {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(name.length + 1));
}

function clearCsrfCookie() {
  if (typeof document === "undefined") {
    return;
  }
  // Match AD-2 cookie flags so browsers actually expire the prior csrftoken.
  const secure =
    typeof window !== "undefined" && window.location?.protocol === "https:";
  let cookie = `${CSRF_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  if (secure) {
    cookie += "; Secure";
  }
  document.cookie = cookie;
}

function isUnsafeMethod(method) {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

/**
 * Normalize DRF error payloads into { fieldErrors, nonFieldErrors, status }.
 */
export function normalizeDrfError(payload, status) {
  const fieldErrors = {};
  const nonFieldErrors = [];

  if (payload == null) {
    return { fieldErrors, nonFieldErrors, status };
  }

  if (typeof payload === "string") {
    nonFieldErrors.push(payload);
    return { fieldErrors, nonFieldErrors, status };
  }

  if (Array.isArray(payload)) {
    nonFieldErrors.push(...payload.map(String));
    return { fieldErrors, nonFieldErrors, status };
  }

  for (const [key, value] of Object.entries(payload)) {
    const messages = Array.isArray(value)
      ? value.map(String)
      : [String(value)];
    if (key === "non_field_errors" || key === "detail") {
      nonFieldErrors.push(...messages);
    } else {
      fieldErrors[key] = messages;
    }
  }

  return { fieldErrors, nonFieldErrors, status };
}

export class ApiError extends Error {
  constructor({ status, fieldErrors, nonFieldErrors, raw }) {
    const first =
      nonFieldErrors[0] ||
      Object.values(fieldErrors).flat()[0] ||
      `Request failed (${status})`;
    super(first);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.nonFieldErrors = nonFieldErrors;
    this.raw = raw;
  }
}

function isCsrfFailure(error) {
  if (!(error instanceof ApiError) || error.status !== 403) {
    return false;
  }
  const haystack = [
    ...error.nonFieldErrors,
    ...Object.values(error.fieldErrors).flat(),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes("csrf");
}

let csrfBootstrapPromise = null;
let sessionEndedHandler = null;
let sessionEndedNotified = false;

/**
 * Register the session-ended UX callback (AuthProvider). Pass null to clear.
 * Invoked at most once per "session ended" episode until reset after Sign in.
 */
export function setSessionEndedHandler(handler) {
  sessionEndedHandler = typeof handler === "function" ? handler : null;
}

/** Allow a new 401 notification after the user signs in again. */
export function resetSessionEndedNotification() {
  sessionEndedNotified = false;
}

function notifySessionEnded() {
  if (sessionEndedNotified || !sessionEndedHandler) {
    return;
  }
  sessionEndedNotified = true;
  try {
    sessionEndedHandler();
  } catch {
    // UX handler must not break the request error path.
  }
}

/**
 * Bootstrap CSRF cookie once (or force-refresh after a CSRF 403).
 */
export async function ensureCsrf({ force = false } = {}) {
  if (force) {
    clearCsrfCookie();
    csrfBootstrapPromise = null;
  } else if (readCookie(CSRF_COOKIE)) {
    return;
  }
  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = fetch("/api/auth/csrf/", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`CSRF bootstrap failed (${response.status})`);
        }
      })
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }
  await csrfBootstrapPromise;
}

/**
 * Low-level request helper. Prefer feature wrappers (register/login/…).
 * @param {string} path
 * @param {RequestInit & { _csrfRetried?: boolean }} options
 */
export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const csrfRetried = Boolean(options._csrfRetried);

  // Strip internal flag before fetch.
  const { _csrfRetried: _ignored, ...fetchOptions } = options;

  if (fetchOptions.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafeMethod(method)) {
    await ensureCsrf();
    const token = readCookie(CSRF_COOKIE);
    if (!token) {
      throw new Error("CSRF token missing after bootstrap.");
    }
    headers.set(CSRF_HEADER, token);
  }

  const response = await fetch(path, {
    ...fetchOptions,
    method,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const normalized = normalizeDrfError(payload, response.status);
    const error = new ApiError({ ...normalized, raw: payload });

    if (
      isUnsafeMethod(method) &&
      isCsrfFailure(error) &&
      !csrfRetried
    ) {
      await ensureCsrf({ force: true });
      return apiRequest(path, { ...fetchOptions, method, _csrfRetried: true });
    }

    // Session-ended UX is for mid-use protected mutations (AC), not Guest /me bootstrap.
    if (response.status === 401 && isUnsafeMethod(method)) {
      notifySessionEnded();
    }
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return payload;
}

/** POST /api/auth/register/ — Customer Sign up. */
export async function register({
  full_name,
  email,
  password,
  confirm_password,
}) {
  return apiRequest("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      full_name,
      email,
      password,
      confirm_password,
    }),
  });
}

/** POST /api/auth/login/ — shared Customer + Admin Sign in. */
export async function login({ email, password }) {
  const user = await apiRequest("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  resetSessionEndedNotification();
  return user;
}

/** POST /api/auth/logout/ — invalidate session. */
export async function logout() {
  return apiRequest("/api/auth/logout/", {
    method: "POST",
  });
}

/** GET /api/auth/me/ — current session identity. */
export async function me() {
  return apiRequest("/api/auth/me/", {
    method: "GET",
  });
}
