import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatPackagePrice, getPublishedPackage } from "./packagesApi.js";

/** Format API ISO calendar date for display without UTC shift. */
export function formatTourDate(iso, locale = undefined) {
  if (!iso || typeof iso !== "string") {
    return "";
  }
  const parts = iso.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    return iso;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SERVER_NO_QUALIFYING_DATES =
  "No qualifying travel dates are available for booking.";

export function mapUnavailableReason(reason) {
  if (!reason) {
    return messages.explore.bookingUnavailable;
  }
  if (reason === SERVER_NO_QUALIFYING_DATES) {
    return messages.explore.bookingUnavailableNoDates;
  }
  return reason;
}

function CoverImage({ src, title }) {
  const [failed, setFailed] = useState(false);
  const trimmed = (src || "").trim();
  const show = Boolean(trimmed) && !failed;
  const alt = show
    ? messages.explore.coverAlt.replace("{title}", title || "")
    : "";

  return (
    <div
      className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-muted)]"
      data-testid="package-detail-cover"
    >
      {show ? (
        <img
          src={trimmed}
          alt={alt}
          className="h-full w-full object-cover"
          data-testid="package-detail-cover-img"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-body-sm text-[var(--color-muted-foreground)]"
          data-testid="package-detail-cover-empty"
        >
          {messages.explore.coverEmpty}
        </div>
      )}
    </div>
  );
}

function AdditionalGallery({ images, title }) {
  const urls = (Array.isArray(images) ? images : [])
    .map((url) => (url || "").trim())
    .filter(Boolean);
  const [failed, setFailed] = useState(() => new Set());

  if (urls.length === 0) {
    return null;
  }
  if (failed.size >= urls.length) {
    return null;
  }

  return (
    <ul
      className="mt-6 m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3"
      data-testid="package-detail-gallery"
    >
      {urls.map((url, index) => {
        if (failed.has(index)) {
          return null;
        }
        return (
          <li
            key={`${url}-${index}`}
            className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-muted)]"
          >
            <img
              src={url}
              alt={messages.explore.galleryAlt
                .replace("{title}", title || "")
                .replace("{index}", String(index + 1))}
              className="h-full w-full object-cover"
              data-testid={`package-detail-gallery-${index}`}
              onError={() => {
                setFailed((prev) => {
                  const next = new Set(prev);
                  next.add(index);
                  return next;
                });
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}

function OptionalBlock({ title, body, testId }) {
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) {
    return null;
  }
  return (
    <section className="mt-8" data-testid={testId}>
      <h2 className="text-headline m-0">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-body-sm text-[var(--color-foreground)]">
        {text}
      </p>
    </section>
  );
}

/**
 * Public package detail — FR-CAT-06 sections + Book Now gating (Story 3.2).
 */
export function PackageDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, role, bootstrapping } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (!id) {
      setPkg(null);
      setError("");
      setNotFound(true);
      setLoading(false);
      return undefined;
    }
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError("");
    setNotFound(false);
    setPkg(null);

    (async () => {
      try {
        const data = await getPublishedPackage(id);
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setPkg(data);
      } catch (err) {
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setPkg(null);
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          setError("");
        } else {
          setNotFound(false);
          setError(
            err instanceof ApiError
              ? err.message
              : messages.explore.errors.generic,
          );
        }
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      loadGenerationRef.current += 1;
    };
  }, [id]);

  const bookingFormPath = id
    ? `/app/bookings/new?package=${encodeURIComponent(id)}`
    : "/app/bookings/new";
  const isGuest = !isAuthenticated;
  const isCustomer = isAuthenticated && role === "CUSTOMER";
  const canShowBookNow = isGuest || isCustomer;
  const bookNowHref = isGuest
    ? `/sign-in?next=${encodeURIComponent(bookingFormPath)}`
    : bookingFormPath;

  const showLoading = loading || bootstrapping;
  const showNotFound = !loading && !bootstrapping && notFound;
  const showError = !loading && !bootstrapping && Boolean(error);
  const showDetail = !loading && !bootstrapping && Boolean(pkg);

  let labelledBy;
  if (showDetail || showNotFound) {
    labelledBy = "package-detail-heading";
  } else if (showLoading) {
    labelledBy = "package-detail-loading-label";
  } else if (showError) {
    labelledBy = "package-detail-error";
  }

  return (
    <section
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby={labelledBy}
      data-testid="package-detail-page"
    >
      <Link
        to="/explore"
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline"
        data-testid="package-detail-back"
      >
        {messages.explore.backToExplore}
      </Link>

      {showLoading ? (
        <p
          id="package-detail-loading-label"
          className="mt-8 text-[var(--color-muted-foreground)]"
          aria-busy="true"
          data-testid="package-detail-loading"
        >
          {messages.explore.detailLoading}
        </p>
      ) : null}

      {showNotFound ? (
        <div className="mt-8" data-testid="package-detail-not-found">
          <h1 id="package-detail-heading" className="text-display-sm m-0">
            {messages.explore.detailNotFoundTitle}
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {messages.explore.detailNotFoundBody}
          </p>
        </div>
      ) : null}

      {showError ? (
        <p
          id="package-detail-error"
          className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
          data-testid="package-detail-error"
        >
          {error}
        </p>
      ) : null}

      {showDetail ? (
        <div className="mt-8">
          <CoverImage src={pkg.cover_image} title={pkg.title} />

          <h1 id="package-detail-heading" className="text-display-sm mt-6 m-0">
            {pkg.title}
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {pkg.short_description}
          </p>
          <p
            className="mt-3 m-0 font-semibold"
            data-testid="package-detail-price"
          >
            {formatPackagePrice(pkg.base_price, pkg.currency)}
          </p>

          <AdditionalGallery
            images={pkg.additional_images}
            title={pkg.title}
          />

          <section className="mt-8" data-testid="package-detail-travel">
            <h2 className="text-headline m-0">
              {messages.explore.detailTravelTitle}
            </h2>
            <dl className="mt-3 m-0 grid gap-2 text-body-sm">
              <div>
                <dt className="inline font-semibold">
                  {messages.explore.detailDestinationLabel}:{" "}
                </dt>
                <dd className="m-0 inline" data-testid="package-detail-destinations">
                  {pkg.destinations}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">
                  {messages.explore.detailDurationLabel}:{" "}
                </dt>
                <dd className="m-0 inline" data-testid="package-detail-duration">
                  {messages.explore.duration
                    .replace("{days}", String(pkg.duration_days ?? ""))
                    .replace("{nights}", String(pkg.duration_nights ?? ""))}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">
                  {messages.explore.detailStartingLabel}:{" "}
                </dt>
                <dd className="m-0 inline" data-testid="package-detail-starting">
                  {pkg.starting_location}
                </dd>
              </div>
              {pkg.difficulty ? (
                <div>
                  <dt className="inline font-semibold">
                    {messages.explore.detailDifficultyLabel}:{" "}
                  </dt>
                  <dd className="m-0 inline" data-testid="package-detail-difficulty">
                    {pkg.difficulty}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="mt-8" data-testid="package-detail-dates">
            <h2 className="text-headline m-0">
              {messages.explore.detailDatesTitle}
            </h2>
            {Array.isArray(pkg.available_dates) &&
            pkg.available_dates.length > 0 ? (
              <ul
                className="mt-3 m-0 list-disc ps-5 text-body-sm"
                data-testid="package-detail-dates-list"
              >
                {pkg.available_dates.map((row) => (
                  <li key={row.id || row.tour_date}>
                    {formatTourDate(row.tour_date)}
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="mt-2 text-body-sm text-[var(--color-muted-foreground)]"
                data-testid="package-detail-dates-empty"
              >
                {messages.explore.detailDatesEmpty}
              </p>
            )}
          </section>

          <OptionalBlock
            title={messages.explore.detailFullDescriptionTitle}
            body={pkg.full_description}
            testId="package-detail-full-description"
          />
          <OptionalBlock
            title={messages.explore.detailIncludedTitle}
            body={pkg.included_services}
            testId="package-detail-included"
          />
          <OptionalBlock
            title={messages.explore.detailExcludedTitle}
            body={pkg.excluded_services}
            testId="package-detail-excluded"
          />
          <OptionalBlock
            title={messages.explore.detailItineraryTitle}
            body={pkg.itinerary}
            testId="package-detail-itinerary"
          />
          <OptionalBlock
            title={messages.explore.detailCancellationTitle}
            body={pkg.cancellation_policy}
            testId="package-detail-cancellation"
          />
          <OptionalBlock
            title={messages.explore.detailAdditionalTitle}
            body={pkg.additional_info}
            testId="package-detail-additional"
          />

          <div className="mt-10" data-testid="package-detail-booking">
            {pkg.is_bookable && canShowBookNow ? (
              <Link
                to={bookNowHref}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 font-semibold text-[var(--color-accent-foreground)] no-underline hover:bg-[var(--color-accent-hover)]"
                data-testid="package-detail-book-now"
              >
                {messages.explore.bookNow}
              </Link>
            ) : !pkg.is_bookable ? (
              <p
                className="m-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-body-sm"
                data-testid="package-detail-unavailable"
                role="status"
              >
                {mapUnavailableReason(pkg.unavailable_reason)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
