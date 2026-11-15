import { Outlet } from "react-router-dom";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { TopNav } from "../components/chrome/TopNav.jsx";
import { messages } from "../i18n/messages.js";

const customerItems = [
  { to: "/explore", label: messages.nav.explore },
  { to: "/ai", label: messages.nav.ai },
  { to: "/app/customer/bookings", label: messages.nav.myBookings },
  { to: "/app/customer/custom-tours", label: messages.nav.customTours },
  { to: "/app/customer/notifications", label: messages.nav.notifications },
  { to: "/sign-out", label: messages.nav.signOut },
];

export function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      <TopNav brandTo="/app/customer" items={customerItems} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
