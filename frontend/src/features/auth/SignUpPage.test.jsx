import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages.js";
import { AuthProvider } from "./AuthContext.jsx";
import { SignUpPage } from "./SignUpPage.jsx";

const navigateMock = vi.fn();

const { registerMock, meMock, ensureCsrfMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
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
    register: registerMock,
    setSessionEndedHandler: vi.fn(),
  };
});

import { ApiError } from "../../services/apiClient.js";

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/sign-up"]}>
      <AuthProvider>
        <SignUpPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SignUpPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
    meMock.mockReset();
    meMock.mockRejectedValue(
      Object.assign(new Error("unauthenticated"), {
        name: "ApiError",
        status: 401,
        fieldErrors: {},
        nonFieldErrors: ["Authentication credentials were not provided."],
      }),
    );
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows password policy and confirm mismatch messages and clears passwords", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(
      screen.getByLabelText(messages.auth.fullName),
      "Alex Traveler",
    );
    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(screen.getByLabelText(messages.auth.password), "short");
    await user.type(
      screen.getByLabelText(messages.auth.confirmPassword),
      "different",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    );

    expect(
      await screen.findByText(messages.auth.errors.passwordWeak),
    ).toBeInTheDocument();
    expect(
      screen.getByText(messages.auth.errors.confirmMismatch),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(messages.auth.password)).toHaveValue("");
    expect(screen.getByLabelText(messages.auth.confirmPassword)).toHaveValue(
      "",
    );
    expect(screen.getByLabelText(messages.auth.email)).toHaveValue(
      "alex@example.com",
    );
    expect(screen.getByLabelText(messages.auth.fullName)).toHaveValue(
      "Alex Traveler",
    );
  });

  it("rejects numbers-only passwords that meet length but lack a letter", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(
      screen.getByLabelText(messages.auth.fullName),
      "Alex Traveler",
    );
    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "12345678",
    );
    await user.type(
      screen.getByLabelText(messages.auth.confirmPassword),
      "12345678",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    );

    expect(
      await screen.findByText(messages.auth.errors.passwordWeak),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows confirm mismatch when passwords differ but policy passes", async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(
      screen.getByLabelText(messages.auth.fullName),
      "Alex Traveler",
    );
    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "SecurePass1",
    );
    await user.type(
      screen.getByLabelText(messages.auth.confirmPassword),
      "SecurePass2",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    );

    expect(
      await screen.findByText(messages.auth.errors.confirmMismatch),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(messages.auth.password)).toHaveValue("");
    expect(screen.getByLabelText(messages.auth.confirmPassword)).toHaveValue(
      "",
    );
  });

  it("shows server duplicate-email error and clears passwords", async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(
      new ApiError({
        status: 400,
        fieldErrors: {
          email: ["An account with this email already exists."],
        },
        nonFieldErrors: [],
        raw: { email: ["An account with this email already exists."] },
      }),
    );

    renderSignUp();

    await user.type(
      screen.getByLabelText(messages.auth.fullName),
      "Alex Traveler",
    );
    await user.type(
      screen.getByLabelText(messages.auth.email),
      "taken@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "SecurePass1",
    );
    await user.type(
      screen.getByLabelText(messages.auth.confirmPassword),
      "SecurePass1",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    );

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(messages.auth.password)).toHaveValue("");
    expect(screen.getByLabelText(messages.auth.confirmPassword)).toHaveValue(
      "",
    );
    expect(screen.getByLabelText(messages.auth.email)).toHaveValue(
      "taken@example.com",
    );
  });

  it("submits valid data via register and navigates to landing", async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue({
      id: "uuid",
      email: "alex@example.com",
      full_name: "Alex Traveler",
      role: "CUSTOMER",
    });
    meMock.mockResolvedValue({
      id: "uuid",
      email: "alex@example.com",
      full_name: "Alex Traveler",
      role: "CUSTOMER",
      is_staff: false,
      is_superuser: false,
    });

    renderSignUp();

    await user.type(
      screen.getByLabelText(messages.auth.fullName),
      "Alex Traveler",
    );
    await user.type(
      screen.getByLabelText(messages.auth.email),
      "alex@example.com",
    );
    await user.type(
      screen.getByLabelText(messages.auth.password),
      "SecurePass1",
    );
    await user.type(
      screen.getByLabelText(messages.auth.confirmPassword),
      "SecurePass1",
    );
    await user.click(
      screen.getByRole("button", { name: messages.auth.submitSignUp }),
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        full_name: "Alex Traveler",
        email: "alex@example.com",
        password: "SecurePass1",
        confirm_password: "SecurePass1",
      });
    });
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
