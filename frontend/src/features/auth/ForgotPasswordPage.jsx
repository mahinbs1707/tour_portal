import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError, requestPasswordReset } from "../../services/apiClient.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClass =
  "mt-1 w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 text-[var(--color-foreground)]";
const labelClass = "text-label text-[var(--color-foreground)]";
const errorClass = "mt-1 text-body-sm text-[var(--color-destructive)]";

export function ForgotPasswordPage() {
  const formId = useId();
  const emailId = `${formId}-email`;
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    setStatusError("");
    setResult(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError(messages.auth.errors.emailRequired);
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError(messages.auth.errors.emailInvalid);
      return;
    }
    setFieldError("");
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const data = await requestPasswordReset({ email: trimmed });
      setResult(data);
    } catch (error) {
      if (error instanceof ApiError) {
        setStatusError(error.nonFieldErrors[0] || messages.auth.errors.generic);
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
      data-testid="forgot-password-page"
    >
      <h1
        id={`${formId}-heading`}
        className="text-headline m-0 text-[var(--color-foreground)]"
      >
        {messages.auth.forgotTitle}
      </h1>
      <p className="mt-2 mb-8 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.forgotSubtitle}
      </p>

      {result ? (
        <div
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
          role="status"
          data-testid="forgot-password-result"
        >
          <p className="m-0 text-body-sm">{result.detail}</p>
          {result.mock_reset_path ? (
            <div
              className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3"
              data-testid="forgot-password-mock-link"
            >
              <p className="m-0 text-body-sm font-semibold">
                {result.mock_delivery_note || messages.auth.forgotMockNote}
              </p>
              <Link
                to={result.mock_reset_path}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]"
              >
                {messages.auth.forgotOpenResetLink}
              </Link>
            </div>
          ) : null}
          <Link
            to="/sign-in"
            className="mt-4 inline-block font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            {messages.nav.signIn}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {statusError ? (
            <p
              role="alert"
              className="m-0 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
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
              aria-invalid={Boolean(fieldError)}
              className={`${inputClass} ${
                fieldError
                  ? "border-[var(--color-destructive)]"
                  : "border-[var(--color-input)]"
              }`}
            />
            {fieldError ? (
              <p className={errorClass} role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? messages.auth.forgotSubmitting
              : messages.auth.forgotSubmit}
          </button>
        </form>
      )}

      <p className="mt-6 text-body-sm text-[var(--color-muted-foreground)]">
        <Link
          to="/sign-in"
          className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          {messages.auth.backToSignIn}
        </Link>
      </p>
    </section>
  );
}
