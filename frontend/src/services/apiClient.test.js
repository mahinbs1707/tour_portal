import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiRequest,
  login,
  logout,
  me,
  register,
  resetSessionEndedNotification,
  setSessionEndedHandler,
} from "./apiClient.js";

function clearCsrfCookie() {
  document.cookie = "csrftoken=; Max-Age=0; path=/";
}

beforeEach(() => {
  resetSessionEndedNotification();
  setSessionEndedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearCsrfCookie();
  resetSessionEndedNotification();
  setSessionEndedHandler(null);
});

describe("apiClient register", () => {
  it("cold-start: fetches CSRF then registers with X-CSRFToken", async () => {
    clearCsrfCookie();
    const fetchMock = vi.fn(async (url) => {
      if (url === "/api/auth/csrf/") {
        document.cookie = "csrftoken=cold-start-token; path=/";
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "CSRF cookie set." }),
        };
      }
      return {
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "1",
          email: "a@example.com",
          full_name: "A",
          role: "CUSTOMER",
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await register({
      full_name: "A",
      email: "a@example.com",
      password: "SecurePass1",
      confirm_password: "SecurePass1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf/");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");

    const [registerUrl, registerOptions] = fetchMock.mock.calls[1];
    expect(registerUrl).toBe("/api/auth/register/");
    expect(registerOptions.credentials).toBe("include");
    expect(registerOptions.headers.get("X-CSRFToken")).toBe("cold-start-token");
  });

  it("maps failing register JSON through normalizeDrfError", async () => {
    document.cookie = "csrftoken=test-csrf-token; path=/";
    const payload = {
      email: ["An account with this email already exists."],
      non_field_errors: ["Registration blocked."],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    let caught;
    try {
      await register({
        full_name: "A",
        email: "taken@example.com",
        password: "SecurePass1",
        confirm_password: "SecurePass1",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(400);
    expect(caught.fieldErrors).toEqual({
      email: ["An account with this email already exists."],
    });
    expect(caught.nonFieldErrors).toEqual(["Registration blocked."]);
  });
});

describe("apiClient login/logout/me", () => {
  it("login posts credentials with CSRF and credentials include", async () => {
    document.cookie = "csrftoken=login-csrf; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        id: "1",
        email: "a@example.com",
        role: "CUSTOMER",
        is_staff: false,
        is_superuser: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = await login({ email: "a@example.com", password: "SecurePass1" });
    expect(user.role).toBe("CUSTOMER");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/login/");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
    expect(fetchMock.mock.calls[0][1].headers.get("X-CSRFToken")).toBe(
      "login-csrf",
    );
  });

  it("logout posts with credentials include", async () => {
    document.cookie = "csrftoken=logout-csrf; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: async () => null,
    });
    vi.stubGlobal("fetch", fetchMock);

    await logout();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/logout/");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });

  it("me GETs current identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        role: "ADMIN",
        is_staff: true,
        is_superuser: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const identity = await me();
    expect(identity.role).toBe("ADMIN");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/me/");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });
});

describe("apiClient FormData", () => {
  it("does not force JSON Content-Type for FormData bodies", async () => {
    document.cookie = "csrftoken=form-csrf; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ cover_image: "/media/packages/x/cover.jpg" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const body = new FormData();
    body.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), "c.jpg");

    await apiRequest("/api/packages/admin/x/media/cover/", {
      method: "POST",
      body,
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("X-CSRFToken")).toBe("form-csrf");
    expect(options.headers.get("Content-Type")).toBeNull();
    expect(options.body).toBe(body);
  });
});

describe("apiClient 401 and CSRF 403", () => {
  it("notifies session-ended handler once on 401", async () => {
    document.cookie = "csrftoken=tok; path=/";
    const handler = vi.fn();
    setSessionEndedHandler(handler);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "Authentication credentials were not provided." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/protected/", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);

    await expect(
      apiRequest("/api/protected/", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not notify session-ended on GET/safe 401", async () => {
    const handler = vi.fn();
    setSessionEndedHandler(handler);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        detail: "Authentication credentials were not provided.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(me()).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("login() re-arms 401 latch after a prior notification", async () => {
    document.cookie = "csrftoken=tok; path=/";
    const handler = vi.fn();
    setSessionEndedHandler(handler);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Authentication credentials were not provided." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "1",
          email: "a@example.com",
          role: "CUSTOMER",
          is_staff: false,
          is_superuser: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Authentication credentials were not provided." }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/protected/", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);

    await login({ email: "a@example.com", password: "SecurePass1" });

    await expect(
      apiRequest("/api/protected/", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("refreshes CSRF once on CSRF 403 then retries; second CSRF 403 fails closed", async () => {
    document.cookie = "csrftoken=stale-token; path=/";
    let postCalls = 0;
    const fetchMock = vi.fn(async (url, options) => {
      if (url === "/api/auth/csrf/") {
        document.cookie = "csrftoken=fresh-token; path=/";
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "CSRF cookie set." }),
        };
      }
      postCalls += 1;
      return {
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "CSRF Failed: CSRF token missing or incorrect." }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/auth/logout/", { method: "POST" }),
    ).rejects.toMatchObject({ status: 403 });

    // Initial POST + CSRF refresh GET + retry POST = 3
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(postCalls).toBe(2);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/csrf/");
    expect(fetchMock.mock.calls[2][1].headers.get("X-CSRFToken")).toBe(
      "fresh-token",
    );
  });
});
