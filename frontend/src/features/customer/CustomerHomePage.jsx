import { messages } from "../../i18n/messages.js";

export function CustomerHomePage() {
  return (
    <section className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]">
      <h1 className="text-display-sm m-0">{messages.customerHome.title}</h1>
      <p className="mt-3 text-[var(--color-muted-foreground)]">{messages.customerHome.body}</p>
    </section>
  );
}
