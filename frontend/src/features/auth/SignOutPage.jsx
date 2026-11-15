import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { useAuth } from "./AuthContext.jsx";

/**
 * Sign out route: invalidate session and return to Landing with Guest chrome.
 */
export function SignOutPage() {
  const { signOut, bootstrapping } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for AuthProvider bootstrap so a late /me/ cannot overwrite Guest.
    if (bootstrapping) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await signOut();
      } finally {
        if (!cancelled) {
          navigate("/", { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapping, signOut, navigate]);

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col px-[var(--space-margin-mobile)] py-[var(--space-section-gap)] lg:px-[var(--space-margin-desktop)]"
      aria-live="polite"
    >
      <p className="m-0 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.auth.signingOut}
      </p>
    </section>
  );
}
