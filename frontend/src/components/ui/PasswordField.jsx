import { useId, useState } from "react";
import { messages } from "../../i18n/messages.js";

const inputClass =
  "w-full min-h-11 rounded-[var(--radius-md)] border bg-[var(--color-card)] px-3 pe-12 text-[var(--color-foreground)]";

/**
 * Password input with show/hide toggle (accessible).
 */
export function PasswordField({
  id,
  name = "password",
  label,
  value,
  onChange,
  disabled = false,
  autoComplete = "current-password",
  error = "",
  describedBy,
  className = "",
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-label text-[var(--color-foreground)]"
        >
          {label}
        </label>
      ) : null}
      <div className={`relative ${label ? "mt-1" : ""}`}>
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            [hasError ? errorId : null, describedBy].filter(Boolean).join(" ") ||
            undefined
          }
          className={`${inputClass} ${
            hasError
              ? "border-[var(--color-destructive)]"
              : "border-[var(--color-input)]"
          }`}
        />
        <button
          type="button"
          className="absolute end-1 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] px-2 text-body-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-muted)] disabled:opacity-50"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={
            visible
              ? messages.auth.hidePassword
              : messages.auth.showPassword
          }
          data-testid={`${inputId}-toggle`}
        >
          {visible ? messages.auth.hidePasswordShort : messages.auth.showPasswordShort}
        </button>
      </div>
      {hasError ? (
        <p
          id={errorId}
          className="mt-1 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
