import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  AdminIconRail,
  AdminNavList,
  AdminSidebarDesktop,
} from "../components/chrome/AdminSidebar.jsx";
import { SkipLink } from "../components/chrome/SkipLink.jsx";
import { Sheet } from "../components/ui/Sheet.jsx";
import { messages } from "../i18n/messages.js";

const ADMIN_NAV_SHEET_ID = "admin-nav-sheet";

/**
 * AdminLayout - EXPERIENCE responsive chrome:
 * >= lg: 240px sidebar
 * md: icon rail (+ sheet)
 * < md: sheet primary (menu trigger)
 */
export function AdminLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false,
  );
  const [isLgUp, setIsLgUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );

  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsMdUp(md.matches);
      setIsLgUp(lg.matches);
      if (lg.matches) {
        setSheetOpen(false);
      }
    };
    onChange();
    md.addEventListener("change", onChange);
    lg.addEventListener("change", onChange);
    return () => {
      md.removeEventListener("change", onChange);
      lg.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SkipLink />
      {isLgUp && <AdminSidebarDesktop />}
      {isMdUp && !isLgUp && <AdminIconRail onOpenSheet={() => setSheetOpen(true)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-[var(--space-margin-mobile)] py-3 lg:px-[var(--space-margin-desktop)]">
          {!isMdUp && (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent text-[var(--color-primary)]"
              aria-label={messages.a11y.openAdminNav}
              aria-expanded={sheetOpen}
              aria-controls={ADMIN_NAV_SHEET_ID}
              onClick={() => setSheetOpen(true)}
            >
              ☰
            </button>
          )}
          <p className="font-display m-0 text-headline text-[var(--color-primary)]">
            {messages.brand.name}
          </p>
        </header>

        <main id="main-content" className="flex-1 overflow-x-hidden p-[var(--space-margin-mobile)] lg:p-[var(--space-margin-desktop)]" tabIndex={-1}>
          {/* Card->detail list chrome container - no horizontal-only tables */}
          <div className="mx-auto w-full max-w-[var(--space-max-content-width)]">
            <Outlet />
          </div>
        </main>
      </div>

      {!isLgUp && (
        <div id={ADMIN_NAV_SHEET_ID}>
          <Sheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title={messages.a11y.adminNav}
            side="left"
            closeLabel={messages.a11y.closeAdminNav}
          >
            <nav
              aria-label={messages.a11y.adminNav}
              className="rounded-[var(--radius-lg)] bg-[var(--color-secondary)] p-3 text-[var(--color-secondary-foreground)]"
            >
              <AdminNavList onNavigate={() => setSheetOpen(false)} />
            </nav>
          </Sheet>
        </div>
      )}
    </div>
  );
}
