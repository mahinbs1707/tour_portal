import { useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { formatPackagePrice } from "./packagesApi.js";

/**
 * Public catalog card (`card-package`) — 4/3 cover, links to detail (Story 3.1).
 */
export function PackageCard({ pkg }) {
  const [coverFailed, setCoverFailed] = useState(false);

  if (!pkg || !pkg.id) {
    return null;
  }

  const duration = messages.explore.duration
    .replace("{days}", String(pkg.duration_days ?? ""))
    .replace("{nights}", String(pkg.duration_nights ?? ""));
  const price = formatPackagePrice(pkg.base_price, pkg.currency);
  const coverSrc = (pkg.cover_image || "").trim();
  const showCover = Boolean(coverSrc) && !coverFailed;
  const coverAlt = showCover
    ? messages.explore.coverAlt.replace("{title}", pkg.title || "")
    : "";

  return (
    <li>
      <Link
        to={`/explore/${pkg.id}`}
        className="block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] no-underline hover:border-[var(--color-primary)]"
        data-testid={`package-card-${pkg.id}`}
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--color-muted)]">
          {showCover ? (
            <img
              src={coverSrc}
              alt={coverAlt}
              className="h-full w-full object-cover"
              data-testid={`package-card-cover-${pkg.id}`}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-body-sm text-[var(--color-muted-foreground)]"
              data-testid={`package-card-cover-empty-${pkg.id}`}
            >
              {messages.explore.coverEmpty}
            </div>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-headline m-0">{pkg.title}</h2>
          <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
            {pkg.short_description}
          </p>
          <p className="mt-3 m-0 text-body-sm">
            <span data-testid={`package-card-destinations-${pkg.id}`}>
              {pkg.destinations}
            </span>
            <span aria-hidden="true"> · </span>
            <span data-testid={`package-card-duration-${pkg.id}`}>{duration}</span>
          </p>
          <p
            className="mt-2 m-0 font-semibold"
            data-testid={`package-card-price-${pkg.id}`}
          >
            {price}
          </p>
        </div>
      </Link>
    </li>
  );
}
