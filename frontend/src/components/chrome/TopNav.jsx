import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { Sheet } from "../ui/Sheet.jsx";

function NavItems({ items, onNavigate, className = "" }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-1 p-0 md:flex-row md:items-center md:gap-6 ${className}`}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            className={({ isActive }) =>
              `relative inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-[var(--color-foreground)] ${
                isActive ? "font-semibold text-[var(--color-primary)]" : "hover:text-[var(--color-primary)]"
              }`
            }
            onClick={onNavigate}
          >
            {item.label}
            {item.badgeCount > 0 ? (
              <span
                className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-body-sm font-semibold text-[var(--color-primary-foreground)]"
                aria-label={`${item.badgeCount} unread notifications`}
                data-testid="notifications-nav-badge"
              >
                {item.badgeCount > 9 ? "9+" : String(item.badgeCount)}
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * Public / Customer top nav (DESIGN nav-header).
 * < md: hamburger -> sheet.
 */
export function TopNav({ brandTo = "/", items }) {
  const [open, setOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      setIsMdUp(mq.matches);
      if (mq.matches) {
        setOpen(false);
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]">
        <div className="mx-auto flex max-w-[var(--space-max-content-width)] items-center justify-between gap-4 px-[var(--space-margin-mobile)] py-3 lg:px-[var(--space-margin-desktop)]">
          <NavLink
            to={brandTo}
            className="font-display text-headline text-[var(--color-primary)]"
          >
            {messages.brand.name}
          </NavLink>

          {isMdUp ? (
            <nav aria-label={messages.a11y.mainNav}>
              <NavItems items={items} />
            </nav>
          ) : (
            !open && (
              <nav aria-label={messages.a11y.mainNav} className="sr-only">
                <NavItems items={items} />
              </nav>
            )
          )}

          {!isMdUp && (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent text-[var(--color-primary)]"
              aria-expanded={open}
              aria-controls="mobile-nav-sheet"
              onClick={() => setOpen(true)}
            >
              <span className="sr-only">{messages.a11y.openMenu}</span>
              <span aria-hidden="true">☰</span>
            </button>
          )}
        </div>
      </header>

      {!isMdUp && (
        <div id="mobile-nav-sheet">
          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            title={messages.brand.name}
            side="right"
          >
            <nav aria-label={messages.a11y.mainNav}>
              <NavItems items={items} onNavigate={() => setOpen(false)} />
            </nav>
          </Sheet>
        </div>
      )}
    </>
  );
}
