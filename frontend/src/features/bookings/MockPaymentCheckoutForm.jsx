import { useId, useState } from "react";
import { messages } from "../../i18n/messages.js";
import { formatPackagePrice } from "../packages/packagesApi.js";
import { PaymentWindowCountdown } from "./PaymentWindowCountdown.jsx";
import { formatSubmittedAt } from "./bookingFormat.js";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCardNumber(value) {
  const digits = digitsOnly(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/**
 * Shared mock checkout panel: order summary + local-only card fields + pay CTA.
 * Outcomes still call the mock payment API (SUCCESS / FAILED / CANCELLED).
 */
export function MockPaymentCheckoutForm({
  title,
  subtitle,
  amount,
  currency,
  referenceLine,
  metaRows = [],
  bookingForCountdown,
  countdownTestIdPrefix,
  deadlineAt,
  disabled,
  submitting,
  onPaySuccess,
  onSimulateFailed,
  onSimulateCancelled,
  successTestId,
  failedTestId,
  cancelledTestId,
  amountTestId,
  referenceTestId,
}) {
  const formId = useId();
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [localError, setLocalError] = useState("");

  const amountLabel = formatPackagePrice(amount, currency);
  const payLabel = messages.booking.checkoutPayCta.replace("{amount}", amountLabel);

  function cardLooksComplete() {
    return (
      cardName.trim().length >= 2 &&
      digitsOnly(cardNumber).length >= 12 &&
      digitsOnly(expiry).length === 4 &&
      digitsOnly(cvc).length >= 3
    );
  }

  function handlePay(event) {
    event.preventDefault();
    if (disabled || submitting) {
      return;
    }
    if (!cardLooksComplete()) {
      setLocalError(messages.booking.checkoutCardIncomplete);
      return;
    }
    setLocalError("");
    onPaySuccess();
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
      <aside className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <h2 className="text-headline m-0">{messages.booking.checkoutOrderTitle}</h2>
        <p className="mt-4 m-0 font-semibold" data-testid={referenceTestId}>
          {referenceLine}
        </p>
        {title ? <p className="mt-2 m-0 text-body-sm">{title}</p> : null}
        {subtitle ? (
          <p className="mt-1 m-0 text-body-sm text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        ) : null}
        <dl className="mt-4 m-0 space-y-2 text-body-sm">
          {metaRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-[var(--color-muted-foreground)]">{row.label}</dt>
              <dd className="m-0 font-semibold text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body-sm text-[var(--color-muted-foreground)]">
              {messages.booking.checkoutAmount}
            </span>
            <span
              className="text-[1.35rem] font-semibold text-[var(--color-primary)]"
              data-testid={amountTestId}
            >
              {amountLabel}
            </span>
          </div>
        </div>
        {bookingForCountdown ? (
          <div className="mt-4">
            <PaymentWindowCountdown
              booking={bookingForCountdown}
              testIdPrefix={countdownTestIdPrefix}
            />
          </div>
        ) : null}
        {deadlineAt ? (
          <p className="mt-2 m-0 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.booking.paymentDeadlineLabel}:{" "}
            <span>{formatSubmittedAt(deadlineAt)}</span>
          </p>
        ) : null}
      </aside>

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <h2 className="text-headline m-0">{messages.booking.checkoutPaymentTitle}</h2>
        <p
          className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-muted)_55%,var(--color-card))] px-3 py-2 text-body-sm"
          role="note"
          data-testid="mock-checkout-legend"
        >
          {messages.booking.checkoutMockLegend}
        </p>

        <form className="mt-5" onSubmit={handlePay} noValidate>
          <div>
            <label className="text-label" htmlFor={`${formId}-name`}>
              {messages.booking.checkoutCardNameLabel}
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              autoComplete="cc-name"
              className={inputClass}
              value={cardName}
              onChange={(e) => {
                setCardName(e.target.value);
                if (localError) setLocalError("");
              }}
              placeholder={messages.booking.checkoutCardNamePlaceholder}
              disabled={disabled}
              data-testid="mock-checkout-card-name"
            />
          </div>
          <div className="mt-4">
            <label className="text-label" htmlFor={`${formId}-number`}>
              {messages.booking.checkoutCardNumberLabel}
            </label>
            <input
              id={`${formId}-number`}
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              className={inputClass}
              value={cardNumber}
              onChange={(e) => {
                setCardNumber(formatCardNumber(e.target.value));
                if (localError) setLocalError("");
              }}
              placeholder={messages.booking.checkoutCardNumberPlaceholder}
              disabled={disabled}
              data-testid="mock-checkout-card-number"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-label" htmlFor={`${formId}-expiry`}>
                {messages.booking.checkoutCardExpiryLabel}
              </label>
              <input
                id={`${formId}-expiry`}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                className={inputClass}
                value={expiry}
                onChange={(e) => {
                  setExpiry(formatExpiry(e.target.value));
                  if (localError) setLocalError("");
                }}
                placeholder={messages.booking.checkoutCardExpiryPlaceholder}
                disabled={disabled}
                data-testid="mock-checkout-card-expiry"
              />
            </div>
            <div>
              <label className="text-label" htmlFor={`${formId}-cvc`}>
                {messages.booking.checkoutCardCvcLabel}
              </label>
              <input
                id={`${formId}-cvc`}
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                className={inputClass}
                value={cvc}
                onChange={(e) => {
                  setCvc(digitsOnly(e.target.value).slice(0, 4));
                  if (localError) setLocalError("");
                }}
                placeholder={messages.booking.checkoutCardCvcPlaceholder}
                disabled={disabled}
                data-testid="mock-checkout-card-cvc"
              />
            </div>
          </div>

          {localError ? (
            <p
              className="mt-3 text-body-sm text-[var(--color-destructive)]"
              role="alert"
              data-testid="mock-checkout-card-error"
            >
              {localError}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] transition-[background-color,transform] duration-150 hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 disabled:opacity-50"
            disabled={disabled}
            data-testid={successTestId}
          >
            {submitting ? messages.booking.checkoutSubmitting : payLabel}
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <p className="m-0 text-body-sm font-semibold text-[var(--color-muted-foreground)]">
            {messages.booking.checkoutDemoTools}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold disabled:opacity-50"
              disabled={disabled}
              onClick={onSimulateFailed}
              data-testid={failedTestId}
            >
              {messages.booking.simulateFailed}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-4 font-semibold text-[var(--color-destructive)] disabled:opacity-50"
              disabled={disabled}
              onClick={onSimulateCancelled}
              data-testid={cancelledTestId}
            >
              {messages.booking.simulateCancelled}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
