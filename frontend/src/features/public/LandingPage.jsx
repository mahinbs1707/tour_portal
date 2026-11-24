import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { PackageCard } from "../packages/PackageCard.jsx";
import { listFeaturedPackages } from "../packages/packagesApi.js";

const FEATURED_SKELETON_COUNT = 3;
const HERO_FALLBACK = "/hero-coast.jpg";

/**
 * Public Landing — full-bleed hero + featured published packages (Story 3.3).
 * Nav stays in PublicLayout; featured query is server-authoritative.
 */
export function LandingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroFailed, setHeroFailed] = useState(false);
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

  const featuredCover = useMemo(() => {
    const withCover = packages.find((pkg) => (pkg?.cover_image || "").trim());
    return withCover ? String(withCover.cover_image).trim() : "";
  }, [packages]);

  const heroSrc = !heroFailed && featuredCover ? featuredCover : HERO_FALLBACK;

  return (
    <div className="landing-page">
      <section
        className="hero-banner relative isolate min-h-[min(92vh,880px)] w-full overflow-hidden"
        aria-labelledby="landing-brand"
        data-testid="landing-hero"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src={heroSrc}
            alt=""
            className="landing-hero-media h-full w-full object-cover"
            onError={() => setHeroFailed(true)}
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,28,34,0.82)_0%,rgba(12,28,34,0.55)_42%,rgba(12,28,34,0.28)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(14,107,107,0.28),transparent_55%)]" />
        </div>

        <div className="relative z-[1] mx-auto flex min-h-[min(92vh,880px)] max-w-[var(--space-max-content-width)] flex-col justify-end px-[var(--space-margin-mobile)] pb-14 pt-28 lg:justify-center lg:px-[var(--space-margin-desktop)] lg:pb-20 lg:pt-24">
          <div className="landing-hero-copy max-w-2xl text-[var(--color-primary-foreground)]">
            <p className="text-label m-0 tracking-[0.14em] text-[color-mix(in_srgb,var(--color-primary-foreground)_78%,transparent)]">
              {messages.brand.promise}
            </p>
            <h1
              id="landing-brand"
              className="font-display mt-4 mb-0 text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
            >
              {messages.landing.heading}
            </h1>
            <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-[color-mix(in_srgb,var(--color-primary-foreground)_88%,transparent)] md:text-lg">
              {messages.landing.subheading}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 font-semibold text-[var(--color-accent-foreground)] no-underline transition-[background-color,transform] duration-200 hover:bg-[var(--color-accent-hover)] hover:-translate-y-0.5"
                data-testid="landing-hero-cta"
              >
                {messages.landing.heroCta}
              </Link>
              <Link
                to="/ai"
                className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-primary-foreground)_45%,transparent)] bg-transparent px-6 font-semibold text-[var(--color-primary-foreground)] no-underline transition-[border-color,background-color] duration-200 hover:border-[var(--color-primary-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary-foreground)_10%,transparent)]"
                data-testid="landing-hero-ai-cta"
              >
                {messages.landing.heroAiCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-featured relative mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-16 lg:px-[var(--space-margin-desktop)] lg:py-20"
        aria-labelledby="landing-featured-heading"
        data-testid="landing-featured"
      >
        <div className="max-w-2xl">
          <h2
            id="landing-featured-heading"
            className="text-display-sm m-0 text-[var(--color-foreground)]"
          >
            {messages.landing.featuredTitle}
          </h2>
          <p className="mt-3 max-w-xl text-[var(--color-muted-foreground)]">
            {messages.landing.featuredSubtitle}
          </p>
          <div
            className="mt-5 h-px w-16 bg-[var(--color-primary)]"
            aria-hidden="true"
          />
        </div>

        {loading ? (
          <ul
            className="mt-10 m-0 grid list-none grid-cols-1 gap-7 p-0 sm:grid-cols-2 lg:grid-cols-3"
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
          <div className="mt-10" data-testid="landing-featured-error">
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
            className="mt-12 border-y border-[var(--color-border)] py-10"
            data-testid="landing-featured-empty"
          >
            <h3 className="text-headline m-0">{messages.landing.emptyTitle}</h3>
            <p className="mt-2 max-w-xl text-body-sm text-[var(--color-muted-foreground)]">
              {messages.landing.emptyBody}
            </p>
            <Link
              to="/explore"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
              data-testid="landing-featured-empty-cta"
            >
              {messages.landing.emptyCta}
            </Link>
          </div>
        ) : null}

        {!loading && packages.length > 0 ? (
          <ul
            className="landing-featured-grid mt-10 m-0 grid list-none grid-cols-1 gap-7 p-0 sm:grid-cols-2 lg:grid-cols-3"
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

      <section
        className="landing-close border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-muted)_55%,var(--color-background))]"
        aria-labelledby="landing-close-heading"
      >
        <div className="mx-auto flex max-w-[var(--space-max-content-width)] flex-col gap-5 px-[var(--space-margin-mobile)] py-14 lg:flex-row lg:items-end lg:justify-between lg:px-[var(--space-margin-desktop)] lg:py-16">
          <div className="max-w-xl">
            <h2
              id="landing-close-heading"
              className="text-display-sm m-0"
            >
              {messages.landing.closeTitle}
            </h2>
            <p className="mt-3 m-0 text-[var(--color-muted-foreground)]">
              {messages.landing.closeBody}
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 font-semibold text-[var(--color-primary-foreground)] no-underline transition-[background-color,transform] duration-200 hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5"
            data-testid="landing-close-cta"
          >
            {messages.landing.closeCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
