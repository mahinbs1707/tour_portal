import { useEffect, useState } from "react";
import { messages } from "../../i18n/messages.js";

const DEFAULT_DURATION_MS = 5000;

/**
 * Ephemeral status toast — EXPERIENCE permission-denied / success toasts use role="status".
 */
export function StatusToast({
  message,
  durationMs = DEFAULT_DURATION_MS,
  onDismiss,
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!visible || !message) {
    return null;
  }

  function handleDismiss() {
    setVisible(false);
    onDismiss?.();
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-body-sm text-[var(--color-foreground)] shadow-[var(--shadow-dropdown)]"
    >
      <p className="m-0 flex-1">{message}</p>
      <button
        type="button"
        className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        aria-label={messages.a11y.dismissStatus}
        onClick={handleDismiss}
      >
        ×
      </button>
    </div>
  );
}
