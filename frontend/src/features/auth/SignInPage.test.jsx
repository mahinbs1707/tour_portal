import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "./AuthContext.jsx";
import { SignInPage } from "./SignInPage.jsx";

const navigateMock = vi.fn();

const { loginMock, meMock, ensureCsrfMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  meMock: vi.fn().mockRejectedValue(
    Object.assign(new Error("unauthenticated"), {
      name: "ApiError",
      status: 401,
      fieldErrors: {},
      nonFieldErrors: ["Authentication credentials were not provided."],
    }),
  ),
  ensureCsrfMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../services/apiClient.js", async () => {
  const actual = await vi.importActual("../../services/apiClient.js");
  return {
    ...actual,
    ensureCsrf: ensureCsrfMock,
    me: meMock,
    login: loginMock,
    setSessionEndedHandler: vi.fn(),
  };
});

import { ApiError } from "../../services/apiClient.js";

function renderSignIn() {
  return render(
    <MemoryRouter initialEntries={["/sign-in"]}>
      <AuthProvider>
        <SignInPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SignInPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows invalid credentials, clears password, keeps email", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new ApiError({
        status: 400,
        fieldErrors: {},
        nonFieldErrors: ["Invalid email or password."],
        raw: { non_field_errors: ["Invalid email or password."] },
      }),
    );

    renderSignIn();

    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "WrongPass1",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignIn }),
    );

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.password)).toHaveValue("");
    expect(screen.getByLabelText(messages.auth.email)).toHaveValue(
      "alex@example.com",
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("signs in and navigates to landing", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      id: "uuid",
      email: "alex@example.com",
      role: "CUSTOMER",
      is_staff: false,
      is_superuser: false,
    });

    renderSignIn();

    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "SecurePass1",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignIn }),
    );

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "alex@example.com",
        password: "SecurePass1",
      });
    });
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
