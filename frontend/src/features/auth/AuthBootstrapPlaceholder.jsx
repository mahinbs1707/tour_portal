import { messages } from "../../i18n/messages.js";

/** Neutral accessible chrome while AuthProvider bootstrap runs. */
export function AuthBootstrapPlaceholder() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
      aria-busy="true"
      aria-label={messages.a11y.loadingSession}
    >
      <span className="sr-only">{messages.a11y.loadingSession}</span>
    </div>
  );
}
