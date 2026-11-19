import { Link, useSearchParams } from "react-router-dom";
import { messages } from "../../i18n/messages.js";

const primaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline hover:bg-[var(--color-primary-hover)]";
const secondaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold no-underline";

/** Confirmation after submit (8.1); links to detail/history (8.2). */
export function CustomTourConfirmationPage() {
  const [searchParams] = useSearchParams();
  const submissionId = (searchParams.get("id") || "").trim();

  return (
    <section
      className="mx-auto max-w-lg px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]"
      aria-labelledby="custom-tour-confirmation-heading"
      data-testid="custom-tour-confirmation-page"
    >
      <h1
        id="custom-tour-confirmation-heading"
        className="text-display-sm m-0 text-[var(--color-foreground)]"
      >
        {messages.customTour.confirmationTitle}
      </h1>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.customTour.confirmationSubtitle}
      </p>

      {submissionId ? (
        <dl className="mt-8 space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div>
            <dt className="text-label text-[var(--color-muted-foreground)]">
              {messages.customTour.idLabel}
            </dt>
            <dd className="m-0 mt-1 break-all font-mono text-body-sm">
              {submissionId}
            </dd>
          </div>
          <div>
            <dt className="text-label text-[var(--color-muted-foreground)]">
              {messages.customTour.statusLabel}
            </dt>
            <dd className="m-0 mt-1">
              <span
                className="inline-flex rounded-full bg-[var(--color-muted)] px-3 py-1 text-body-sm font-semibold"
                data-testid="custom-tour-confirmation-status"
              >
                {messages.customTour.customTourStatus.PENDING}
              </span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-6 text-[var(--color-destructive)]" role="alert">
          {messages.customTour.confirmationMissing}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {submissionId ? (
          <Link
            to={`/app/customer/custom-tours/${encodeURIComponent(submissionId)}`}
            className={primaryLink}
            data-testid="custom-tour-confirmation-details"
          >
            {messages.customTour.viewDetails}
          </Link>
        ) : null}
        <Link
          to="/app/customer/custom-tours"
          className={submissionId ? secondaryLink : primaryLink}
          data-testid="custom-tour-confirmation-back"
        >
          {messages.customTour.backToCustomTours}
        </Link>
      </div>
    </section>
  );
}