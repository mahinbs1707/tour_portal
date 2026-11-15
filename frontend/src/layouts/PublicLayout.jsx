import { Outlet } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { messages } from "../i18n/messages.js";

const guestItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/sign-in", label: messages.nav.signIn },
  { to: "/sign-up", label: messages.nav.signUp },
];

/** Minimal signed-in chrome on public shell (Customer extras wait for Story 1.6). */
const signedInItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/sign-out", label: messages.nav.signOut },
];

/** Neutral chrome while session bootstrap runs — avoid Guest Sign in/up flash. */
const bootstrappingItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
];

export function PublicLayout() {
  const { isAuthenticated, bootstrapping } = useAuth();
  const items = bootstrapping
    ? bootstrappingItems
    : isAuthenticated
      ? signedInItems
      : guestItems;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav items={items} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
