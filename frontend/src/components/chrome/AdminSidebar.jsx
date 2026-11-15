import { NavLink } from "react-router-dom";
import { messages } from "../../i18n/messages.js";

const adminItems = [
  { to: "/app/admin", label: messages.nav.home, end: true, icon: "⌂" },
  { to: "/app/admin/packages", label: messages.nav.packages, icon: "▣" },
  { to: "/app/admin/bookings", label: messages.nav.bookings, icon: "☰" },
  { to: "/app/admin/custom-tours", label: messages.nav.customToursAdmin, icon: "✎" },
  { to: "/", label: messages.nav.viewSite, icon: "↗" },
];

function linkClass({ isActive }) {
  return `chrome-motion flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 ${
    isActive
      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
      : "text-[var(--color-secondary-foreground)] hover:bg-[rgba(247,244,239,0.12)]"
  }`;
}

export function AdminNavList({ onNavigate, compact = false }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {adminItems.map((item) => (
        <li key={item.to + item.label}>
          <NavLink
            to={item.to}
            end={item.end}
            className={linkClass}
            title={item.label}
            onClick={onNavigate}
          >
            <span aria-hidden="true" className="inline-flex w-6 justify-center">
              {item.icon}
            </span>
            {!compact && <span>{item.label}</span>}
            {compact && <span className="sr-only">{item.label}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Fixed 240px sidebar for lg+ (DESIGN admin-sidebar). */
export function AdminSidebarDesktop() {
  return (
    <aside
      className="hidden w-[var(--space-admin-sidebar-width)] shrink-0 flex-col bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] lg:flex"
      aria-label={messages.a11y.adminSidebar}
    >
      <div className="border-b border-[rgba(247,244,239,0.16)] px-4 py-4">
        <p className="font-display m-0 text-headline">{messages.brand.name}</p>
        <p className="text-label m-0 mt-1 opacity-80">{messages.a11y.adminNav}</p>
      </div>
      <nav aria-label={messages.a11y.adminNav} className="flex-1 p-3">
        <AdminNavList />
      </nav>
    </aside>
  );
}

/**
 * md icon rail — icons trigger sheet via parent; labels available to SR.
 */
export function AdminIconRail({ onOpenSheet }) {
  return (
    <aside
      className="hidden w-14 shrink-0 flex-col bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] md:flex lg:hidden"
      aria-label={messages.a11y.adminSidebar}
    >
      <button
        type="button"
        className="chrome-motion m-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[rgba(247,244,239,0.24)] bg-transparent text-[var(--color-secondary-foreground)]"
        aria-label={messages.a11y.openAdminNav}
        aria-controls="admin-nav-sheet"
        onClick={onOpenSheet}
      >
        ☰
      </button>
      <nav aria-label={messages.a11y.adminNav} className="flex-1 p-2">
        <AdminNavList
          compact
          onNavigate={() => {
            /* icon rail links navigate directly; sheet remains optional */
          }}
        />
      </nav>
    </aside>
  );
}
