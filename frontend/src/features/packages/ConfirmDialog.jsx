import { useEffect, useId, useRef } from "react";

/**
 * Minimal confirm dialog (modal stack depth 1): Tab cycle, Esc, restore focus.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  role = "dialog",
  children = null,
  initialFocusRef = null,
  confirmDisabled = false,
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    previouslyFocused.current = document.activeElement;
    // Defer so children (e.g. textarea refs) are mounted before focus.
    const focusTimer = window.setTimeout(() => {
      (initialFocusRef?.current || confirmRef.current)?.focus();
    }, 0);

    function focusables() {
      const root = dialogRef.current;
      if (!root) {
        return [];
      }
      return Array.from(
        root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el instanceof HTMLElement);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !rootContains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !rootContains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    function rootContains(node) {
      return Boolean(dialogRef.current && node && dialogRef.current.contains(node));
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      if (
        previouslyFocused.current &&
        typeof previouslyFocused.current.focus === "function"
      ) {
        previouslyFocused.current.focus();
      }
    };
    // Intentionally depend only on `open` (and stable initialFocusRef).
    // Inline onCancel/onConfirm from parents must not re-run this effect —
    // that steals focus from textareas on every keystroke.
  }, [open, initialFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-[var(--color-card-foreground)] shadow-[var(--shadow-dropdown)]"
      >
        <h2 id={titleId} className="text-headline m-0">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
          {body}
        </p>
        {children}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-[var(--color-foreground)]"
            onClick={onCancel}
            disabled={confirmDisabled}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
