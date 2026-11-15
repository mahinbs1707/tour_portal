import { messages } from "../../i18n/messages.js";

/**
 * Landing - hero-capable brand chrome only (no full marketing content in 1.2).
 */
export function LandingPage() {
  return (
    <section
      className="mx-auto flex min-h-[70vh] max-w-[var(--space-max-content-width)] flex-col justify-center px-[var(--space-margin-mobile)] py-[var(--space-section-gap)] lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="landing-brand"
    >
      <p className="text-label m-0 text-[var(--color-primary)]">{messages.brand.promise}</p>
      <h1 id="landing-brand" className="text-display mt-3 mb-0 text-[var(--color-foreground)]">
        {messages.landing.heading}
      </h1>
    </section>
  );
}
