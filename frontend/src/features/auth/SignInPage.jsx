import { useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../../components/ui/PasswordField.jsx";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";
import { safeNextPath } from "./safeNextPath.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateClient({ email, password }) {
  const errors = {};
  if (!email.trim()) {
    errors.email = messages.auth.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = messages.auth.errors.emailInvalid;
  }
  if (!password) {
    errors.password = messages.auth.errors.passwordRequired;
  }
  return errors;
}

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const formId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const resetSuccess = Boolean(location.state?.passwordResetSuccess);

  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const statusId = `${formId}-status`;
  const nextParam = searchParams.get("next");
  const safeNext = safeNextPath(nextParam);
  const signUpHref = safeNext
    ? `/sign-up?next=${encodeURIComponent(safeNext)}`
    : "/sign-up";

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    setStatusError("");

    const clientErrors = validateClient({ email, password });
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setPassword("");
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await signIn({
        email: email.trim(),
        password,
      });
      navigate(safeNext ?? "/", { replace: true });
    } catch (error) {
      setPassword("");
      if (error instanceof ApiError) {
        const nonField = error.nonFieldErrors[0];
        setStatusError(nonField || messages.auth.errors.invalidCredentials);
        setFieldErrors({});
      } else {
        setStatusError(messages.auth.errors.generic);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col px-[var(--space-margin-mobile)] py-[var(--space-section-gap)] lg:px-[var(--space-margin-desktop)]"
      aria-labelledby={`${formId}-heading`}
    >
      <h1
        id={`${formId}-heading`}
        className="text-headline m-0 text-[var(--color-foreground)]"
      >
        {messages.auth.signInTitle}
      </h1>
      <p className="mt-2 mb-8 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.signInSubtitle}
      </p>

      {resetSuccess ? (
        <p
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-body-sm"
          role="status"
          data-testid="password-reset-success"
        >
          {messages.auth.resetSuccessBanner}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {statusError ? (
          <p
            id={statusId}
            role="alert"
            className="m-0 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[var(--color-card)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          >
            {statusError}
          </p>
        ) : null}

        <div>
          <label htmlFor={emailId} className={labelClass}>
            {messages.auth.email}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? `${emailId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.email
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
          />
          {fieldErrors.email ? (
            <p id={`${emailId}-error`} className={errorClass} role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <PasswordField
          id={passwordId}
          name="password"
          label={messages.auth.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          error={fieldErrors.password || ""}
        />

        <p className="m-0 -mt-2 text-end text-body-sm">
          <Link
            to="/forgot-password"
            className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
            data-testid="forgot-password-link"
          >
            {messages.auth.forgotPasswordLink}
          </Link>
        </p>

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--color-primary-disabled-bg)] disabled:text-[var(--color-primary-disabled-fg)]"
        >
          {submitting
            ? messages.auth.signingIn
            : messages.auth.submitSignIn}
        </button>
      </form>

      <p className="mt-6 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.needAccount}{" "}
        <Link
          to={signUpHref}
          className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          {messages.nav.signUp}
        </Link>
      </p>
    </section>
  );
}
