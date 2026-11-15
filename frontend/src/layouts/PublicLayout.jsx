import { Outlet } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { messages } from "../i18n/messages.js";

const guestItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/sign-in", label: messages.nav.signIn },
  { to: "/sign-up", label: messages.nav.signUp },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav items={guestItems} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
