import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { PackageCard } from "../packages/PackageCard.jsx";
import { listFeaturedPackages } from "../packages/packagesApi.js";

const FEATURED_SKELETON_COUNT = 3;

/**
 * Public Landing — hero-banner + featured published packages (Story 3.3).
 * Nav stays in PublicLayout; featured query is server-authoritative.
 */
export function LandingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadGenerationRef = useRef(0);

  const loadFeatured = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await listFeaturedPackages({ page: 1 });
      if (generation !== loadGenerationRef.current) {
        return;
      }
      if (!data || !Array.isArray(data.results)) {
        setPackages([]);
        setError(messages.landing.errors.generic);
        return;
      }
      setPackages(data.results);
    } catch (err) {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setError(
        err instanceof ApiError ? err.message : messages.landing.errors.generic,
      );
      setPackages([]);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFeatured();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadFeatured]);

  return (
    <div>
      <section
        className="hero-banner relative w-full overflow-hidden aspect-[4/5] md:aspect-[21/9]"
        aria-labelledby="landing-brand"
        data-testid="landing-hero"
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-muted)_0%,var(--color-background)_45%,color-mix(in_srgb,var(--color-primary)_18%,var(--color-background))_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_20%_30%,color-mix(in_srgb,var(--color-primary)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_70%,color-mix(in_srgb,var(--color-secondary)_12%,transparent),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="relative z-[1] mx-auto flex h-full max-w-[var(--space-max-content-width)] flex-col justify-end px-[var(--space-margin-mobile)] pb-10 pt-16 lg:justify-center lg:px-[var(--space-margin-desktop)] lg:pb-12 lg:pt-12">
          <p className="text-label m-0 text-[var(--color-primary)]">
            {messages.brand.promise}
          </p>
          <h1
            id="landing-brand"
            className="text-display mt-3 mb-0 text-[var(--color-foreground)]"
          >
            {messages.landing.heading}
          </h1>
          <p className="mt-3 max-w-xl text-body-sm text-[var(--color-muted-foreground)] md:text-base">
            {messages.landing.subheading}
          </p>
          <Link
            to="/explore"
            className="mt-6 inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]"
            data-testid="landing-hero-cta"
          >
            {messages.landing.heroCta}
          </Link>
        </div>
      </section>

      <section
        className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
        aria-labelledby="landing-featured-heading"
        data-testid="landing-featured"
      >
        <h2 id="landing-featured-heading" className="text-display-sm m-0">
          {messages.landing.featuredTitle}
        </h2>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {messages.landing.featuredSubtitle}
        </p>

        {loading ? (
          <ul
            className="mt-8 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-label={messages.landing.featuredLoading}
            data-testid="landing-featured-loading"
          >
            {Array.from({ length: FEATURED_SKELETON_COUNT }, (_, index) => (
              <li
                key={`featured-skeleton-${index}`}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]"
                data-testid={`landing-featured-skeleton-${index}`}
              >
                <div className="aspect-[4/3] w-full animate-pulse bg-[var(--color-muted)]" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--color-muted)]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[var(--color-muted)]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-muted)]" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div className="mt-8" data-testid="landing-featured-error">
            <p
              className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
              role="alert"
            >
              {error}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold"
                onClick={() => loadFeatured()}
                data-testid="landing-featured-retry"
              >
                {messages.landing.retry}
              </button>
              <Link
                to="/explore"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
                data-testid="landing-featured-error-explore"
              >
                {messages.landing.heroCta}
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && !error && packages.length === 0 ? (
          <div
            className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
            data-testid="landing-featured-empty"
          >
            <h3 className="text-headline m-0">{messages.landing.emptyTitle}</h3>
            <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
              {messages.landing.emptyBody}
            </p>
            <Link
              to="/explore"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
              data-testid="landing-featured-empty-cta"
            >
              {messages.landing.emptyCta}
            </Link>
          </div>
        ) : null}

        {!loading && packages.length > 0 ? (
          <ul
            className="mt-8 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="landing-featured-list"
          >
            {packages
              .filter((pkg) => pkg != null && pkg.id != null)
              .map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
