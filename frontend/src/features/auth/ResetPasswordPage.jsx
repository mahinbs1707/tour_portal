import { useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../../components/ui/PasswordField.jsx";
import { messages } from "../../i18n/messages.js";
import { ApiError, confirmPasswordReset } from "../../services/apiClient.js";

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formId = useId();
  const uid = (searchParams.get("uid") || "").trim();
  const token = (searchParams.get("token") || "").trim();
  const linkMissing = !uid || !token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [statusError, setStatusError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || linkMissing) {
      return;
    }
    setStatusError("");
    const errors = {};
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
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await confirmPasswordReset({
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      });
      navigate("/sign-in", {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    } catch (error) {
      setPassword("");
      setConfirmPassword("");
      if (error instanceof ApiError) {
        const next = {};
        for (const [key, list] of Object.entries(error.fieldErrors || {})) {
          next[key] = list[0];
        }
        setFieldErrors(next);
        setStatusError(
          error.nonFieldErrors[0] ||
            (Object.keys(next).length ? "" : messages.auth.errors.resetInvalid),
        );
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
      data-testid="reset-password-page"
    >
      <h1
        id={`${formId}-heading`}
        className="text-headline m-0 text-[var(--color-foreground)]"
      >
        {messages.auth.resetTitle}
      </h1>
      <p className="mt-2 mb-8 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.resetSubtitle}
      </p>

      {linkMissing ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {messages.auth.errors.resetInvalid}
        </p>
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
          <PasswordField
            id={`${formId}-password`}
            name="password"
            label={messages.auth.newPassword}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            error={fieldErrors.password || ""}
          />
          <PasswordField
            id={`${formId}-confirm`}
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
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? messages.auth.resetSubmitting
              : messages.auth.resetSubmit}
          </button>
        </form>
      )}

      <p className="mt-6 text-body-sm">
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
