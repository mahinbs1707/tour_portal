import { useEffect, useId, useRef } from "react";
import { messages } from "../../i18n/messages.js";

/**
 * Minimal drawer-sheet primitive (DESIGN drawer-sheet a11y contract).
 * Trap + Esc + labelled title + restore focus.
 */
export function Sheet({
  open,
  onClose,
  title,
  labelledById,
  children,
  side = "left",
  closeLabel = messages.a11y.closeMenu,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const labelId = labelledById ?? titleId;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      node?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    const first = focusables()[0];
    first?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) {
        return;
      }
      const items = [...focusables()];
      if (items.length === 0) {
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const sideClass =
    side === "left"
      ? "left-0 border-r"
      : "right-0 border-l";

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-[var(--scrim)]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={`chrome-motion absolute top-0 ${sideClass} flex h-full w-[min(100%,var(--space-admin-sidebar-width))] flex-col border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-dropdown)]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <h2 id={titleId} className="text-headline m-0">
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-[var(--color-primary)]"
            aria-label={closeLabel}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
