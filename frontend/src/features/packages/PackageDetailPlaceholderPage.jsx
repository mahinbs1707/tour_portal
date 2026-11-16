import { Link, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";

/**
 * Minimal detail route stub for Story 3.2 navigation targets (Story 3.1).
 */
export function PackageDetailPlaceholderPage() {
  const { id } = useParams();

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="package-detail-placeholder-heading"
      data-testid="package-detail-placeholder"
    >
      <h1 id="package-detail-placeholder-heading" className="text-display-sm m-0">
        {messages.explore.detailPlaceholderTitle}
      </h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        {messages.explore.detailPlaceholderBody}
      </p>
      {id ? (
        <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
          {messages.explore.detailPlaceholderId.replace("{id}", id)}
        </p>
      ) : null}
      <Link
        to="/explore"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
      >
        {messages.explore.backToExplore}
      </Link>
    </section>
  );
}
