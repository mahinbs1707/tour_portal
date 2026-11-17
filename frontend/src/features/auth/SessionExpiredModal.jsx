import { Link, useLocation } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { useAuth } from "./AuthContext.jsx";
import { safeNextPath } from "./safeNextPath.js";

/**
 * Session-ended modal (UX-DR11). Shown when apiClient receives 401.
 */
export function SessionExpiredModal() {
  const { sessionExpiredOpen, dismissSessionExpired } = useAuth();
  const location = useLocation();
  const returnTo = safeNextPath(
    `${location.pathname}${location.search}${location.hash}`,
  );
  const signInHref = returnTo
    ? `/sign-in?next=${encodeURIComponent(returnTo)}`
    : "/sign-in";

  if (!sessionExpiredOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={dismissSessionExpired}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-ended-title"
        aria-describedby="session-ended-body"
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-[var(--color-foreground)] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="session-ended-title"
          className="text-headline m-0 text-[var(--color-foreground)]"
        >
          {messages.auth.sessionEndedTitle}
        </h2>
        <p
          id="session-ended-body"
          className="mt-3 mb-6 text-body-sm text-[var(--color-muted-foreground)]"
        >
          {messages.auth.sessionEndedBody}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={signInHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
            onClick={dismissSessionExpired}
          >
            {messages.nav.signIn}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-4 text-[var(--color-foreground)]"
            onClick={dismissSessionExpired}
          >
            {messages.auth.sessionEndedDismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
