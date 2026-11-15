import { messages } from "../../i18n/messages.js";

/**
 * Admin empty home + card-list chrome ready for tablet/phone (no H-scroll tables).
 */
export function AdminHomePage() {
  return (
    <section>
      <h1 className="text-display-sm m-0">{messages.adminHome.title}</h1>
      <p className="mt-3 text-[var(--color-muted-foreground)]">{messages.adminHome.body}</p>

      <ul className="mt-8 m-0 flex list-none flex-col gap-3 p-0">
        <li className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)]">
          <p className="text-headline m-0">{messages.adminHome.listChromeHint}</p>
          <p className="text-body-sm m-0 mt-2 text-[var(--color-muted-foreground)]">
            {messages.adminHome.body}
          </p>
        </li>
      </ul>
    </section>
  );
}
