import { useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../../components/ui/PasswordField.jsx";
import { messages } from "../../i18n/messages.js";
import { ApiError, me, register } from "../../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";
import { safeNextPath } from "./safeNextPath.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function validateClient({ fullName, email, password, confirmPassword }) {
  const errors = {};

  if (!fullName.trim()) {
    errors.full_name = messages.auth.errors.fullNameRequired;
  }
  if (!email.trim()) {
    errors.email = messages.auth.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = messages.auth.errors.emailInvalid;
  }
  if (!password) {
    errors.password = messages.auth.errors.passwordRequired;
  } else if (!PASSWORD_POLICY.test(password)) {
    errors.password = messages.auth.errors.passwordWeak;
  }
  if (!confirmPassword) {
    errors.confirm_password = messages.auth.errors.confirmRequired;
  } else if (password && confirmPassword !== password) {
    errors.confirm_password = messages.auth.errors.confirmMismatch;
  }

  return errors;
}

const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";

export function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const formId = useId();
  const nextParam = searchParams.get("next");
  const safeNext = safeNextPath(nextParam);
  const signInHref = safeNext
    ? `/sign-in?next=${encodeURIComponent(safeNext)}`
    : "/sign-in";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const fullNameId = `${formId}-full-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const confirmId = `${formId}-confirm`;
  const statusId = `${formId}-status`;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    setStatusError("");

    const clientErrors = validateClient({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setPassword("");
      setConfirmPassword("");
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const registered = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });
      try {
        const identity = await me();
        setUser(identity);
      } catch {
        // Session exists after register; keep signed-in chrome if /me/ flakes.
        setUser({
          ...registered,
          is_staff: false,
          is_superuser: false,
        });
      }
      navigate(safeNext ?? "/", { replace: true });
    } catch (error) {
      setPassword("");
      setConfirmPassword("");

      if (error instanceof ApiError) {
        const next = {};
        for (const [key, messagesList] of Object.entries(error.fieldErrors)) {
          next[key] = messagesList[0];
        }
        setFieldErrors(next);
        const hasFieldErrors = Object.keys(next).length > 0;
        const nonField = error.nonFieldErrors[0];
        if (nonField) {
          setStatusError(nonField);
        } else if (!hasFieldErrors) {
          setStatusError(messages.auth.errors.generic);
        } else {
          setStatusError("");
        }
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
        {messages.auth.signUpTitle}
      </h1>
      <p className="mt-2 mb-8 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.signUpSubtitle}
      </p>

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
          <label htmlFor={fullNameId} className={labelClass}>
            {messages.auth.fullName}
          </label>
          <input
            id={fullNameId}
            name="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={
              fieldErrors.full_name ? `${fullNameId}-error` : undefined
            }
            className={`${inputClass} ${
              fieldErrors.full_name
                ? "border-[var(--color-destructive)]"
                : "border-[var(--color-input)]"
            }`}
          />
          {fieldErrors.full_name ? (
            <p id={`${fullNameId}-error`} className={errorClass} role="alert">
              {fieldErrors.full_name}
            </p>
          ) : null}
        </div>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          error={fieldErrors.password || ""}
        />

        <PasswordField
          id={confirmId}
          name="confirm_password"
          label={messages.auth.confirmPassword}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          error={fieldErrors.confirm_password || ""}
        />

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--color-primary-disabled-bg)] disabled:text-[var(--color-primary-disabled-fg)]"
        >
          {submitting ? messages.auth.submitting : messages.auth.submitSignUp}
        </button>
      </form>

      <p className="mt-6 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.haveAccount}{" "}
        <Link
          to={signInHref}
          className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          {messages.nav.signIn}
        </Link>
      </p>
    </section>
  );
}
