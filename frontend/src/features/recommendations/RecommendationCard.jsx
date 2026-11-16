import { useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { formatPackagePrice } from "../packages/packagesApi.js";

/**
 * AI recommendation card — distinct from catalog PackageCard (Story 4.2).
 * Shows cover/title/meta + why-match; links to package detail.
 */
export function RecommendationCard({ recommendation }) {
  const [coverFailed, setCoverFailed] = useState(false);

  if (!recommendation || !recommendation.id) {
    return null;
  }

  const pkg = recommendation;
  const duration = messages.explore.duration
    .replace("{days}", String(pkg.duration_days ?? ""))
    .replace("{nights}", String(pkg.duration_nights ?? ""));
  const price = formatPackagePrice(pkg.base_price, pkg.currency);
  const coverSrc = (pkg.cover_image || "").trim();
  const showCover = Boolean(coverSrc) && !coverFailed;
  const coverAlt = showCover
    ? messages.explore.coverAlt.replace("{title}", pkg.title || "")
    : "";
  const why = (pkg.why || "").trim();

  return (
    <li>
      <Link
        to={`/explore/${pkg.id}`}
        className="block overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-card-foreground)] no-underline shadow-[0_1px_0_color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:border-[var(--color-primary-hover)]"
        data-testid={`recommendation-card-${pkg.id}`}
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--color-muted)]">
          {showCover ? (
            <img
              src={coverSrc}
              alt={coverAlt}
              className="h-full w-full object-cover"
              data-testid={`recommendation-card-cover-${pkg.id}`}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-body-sm text-[var(--color-muted-foreground)]"
              data-testid={`recommendation-card-cover-empty-${pkg.id}`}
            >
              {messages.explore.coverEmpty}
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-label m-0 text-[var(--color-primary)]">
            {messages.ai.cardBadge}
          </p>
          <h3 className="text-headline mt-1 mb-0">{pkg.title}</h3>
          <p className="mt-3 m-0 text-body-sm">
            <span data-testid={`recommendation-card-destinations-${pkg.id}`}>
              {pkg.destinations}
            </span>
            <span aria-hidden="true"> · </span>
            <span data-testid={`recommendation-card-duration-${pkg.id}`}>
              {duration}
            </span>
          </p>
          <p
            className="mt-2 m-0 font-semibold"
            data-testid={`recommendation-card-price-${pkg.id}`}
          >
            {price}
          </p>
          {why ? (
            <p
              className="mt-3 m-0 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] px-3 py-2 text-body-sm text-[var(--color-foreground)]"
              data-testid={`recommendation-card-why-${pkg.id}`}
            >
              <span className="text-label block text-[var(--color-primary)]">
                {messages.ai.whyLabel}
              </span>
              {why}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
