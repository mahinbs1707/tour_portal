import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { RecommendationCard } from "./RecommendationCard.jsx";
import {
  PROMPT_MAX_LEN,
  fetchRecommendations,
  providerErrorMessage,
  validatePrompt,
} from "./recommendationsApi.js";

const MAX_DISPLAY = 5;

/** Keep first ≤5 items that have an id; drop null/missing/duplicate ids. */
function normalizeResults(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set();
  const list = [];
  for (const item of raw) {
    if (!item || item.id == null || item.id === "") {
      continue;
    }
    const key = String(item.id);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    list.push(item);
    if (list.length >= MAX_DISPLAY) {
      break;
    }
  }
  return list;
}

/**
 * Public AI recommendations — prompt → ≤5 RecommendationCards (Story 4.2).
 * Guests and Customers; Explore remains usable on empty/provider failure.
 */
export function AiRecommendationsPage() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [providerFail, setProviderFail] = useState("");
  const [emptySuccess, setEmptySuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    return () => {
      requestGenerationRef.current += 1;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const validated = validatePrompt(prompt, messages);
    if (!validated.ok) {
      setFieldError(validated.message);
      setResults(null);
      setEmptySuccess(false);
      setProviderFail("");
      setStatusMessage("");
      return;
    }

    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setFieldError("");
    setProviderFail("");
    setEmptySuccess(false);
    setResults(null);
    setStatusMessage(messages.ai.loading);
    try {
      const data = await fetchRecommendations(validated.prompt);
      if (generation !== requestGenerationRef.current) {
        return;
      }
      const list = normalizeResults(data?.results);
      if (list.length === 0) {
        setResults([]);
        setEmptySuccess(true);
        setStatusMessage(messages.ai.emptyTitle);
      } else {
        setResults(list);
        setEmptySuccess(false);
        setStatusMessage(
          messages.ai.resultsStatus.replace("{count}", String(list.length)),
        );
      }
    } catch (err) {
      if (generation !== requestGenerationRef.current) {
        return;
      }
      setResults(null);
      setEmptySuccess(false);
      if (err instanceof ApiError && err.status === 400) {
        const promptMsgs = err.fieldErrors?.prompt;
        setFieldError(
          Array.isArray(promptMsgs) && promptMsgs.length > 0
            ? promptMsgs.join(" ")
            : messages.ai.errors.validation,
        );
        setProviderFail("");
        setStatusMessage("");
      } else if (
        err instanceof ApiError &&
        (err.status === 502 || err.status === 503)
      ) {
        setFieldError("");
        setProviderFail(
          providerErrorMessage(err, messages.ai.errors.provider),
        );
        setStatusMessage(messages.ai.failTitle);
      } else {
        setFieldError("");
        setProviderFail(
          err instanceof ApiError
            ? providerErrorMessage(err, messages.ai.errors.generic)
            : messages.ai.errors.generic,
        );
        setStatusMessage(messages.ai.failTitle);
      }
    } finally {
      if (generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-10 lg:px-[var(--space-margin-desktop)]"
      data-testid="ai-recommendations-page"
    >
      <header className="max-w-2xl">
        <p className="text-label m-0 text-[var(--color-primary)]">
          {messages.ai.eyebrow}
        </p>
        <h1 className="text-display mt-2 mb-0">{messages.ai.title}</h1>
        <p className="mt-3 text-[var(--color-muted-foreground)]">
          {messages.ai.subtitle}
        </p>
      </header>

      <form
        className="mt-8 max-w-2xl"
        onSubmit={handleSubmit}
        noValidate
        data-testid="ai-recommendations-form"
        aria-busy={loading ? "true" : undefined}
      >
        <label
          htmlFor="ai-prompt"
          className="text-label block text-[var(--color-foreground)]"
        >
          {messages.ai.promptLabel}
        </label>
        <textarea
          id="ai-prompt"
          name="prompt"
          rows={4}
          maxLength={PROMPT_MAX_LEN}
          value={prompt}
          disabled={loading}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (fieldError) {
              setFieldError("");
            }
          }}
          placeholder={messages.ai.promptPlaceholder}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-foreground)]"
          aria-invalid={fieldError ? "true" : undefined}
          aria-describedby={
            fieldError ? "ai-prompt-hint ai-prompt-error" : "ai-prompt-hint"
          }
          data-testid="ai-prompt-input"
        />
        <p
          id="ai-prompt-hint"
          className="mt-1 m-0 text-body-sm text-[var(--color-muted-foreground)]"
        >
          {messages.ai.promptHint.replace("{max}", String(PROMPT_MAX_LEN))}
        </p>
        {fieldError ? (
          <p
            id="ai-prompt-error"
            className="mt-2 m-0 text-body-sm text-[var(--color-destructive)]"
            role="alert"
            data-testid="ai-prompt-error"
          >
            {fieldError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:bg-[var(--color-primary-disabled-bg)] disabled:text-[var(--color-primary-disabled-fg)]"
          data-testid="ai-submit"
        >
          {loading ? messages.ai.submitting : messages.ai.submit}
        </button>
      </form>

      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="ai-status-live"
      >
        {statusMessage}
      </div>

      {loading ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          aria-busy="true"
          data-testid="ai-loading"
        >
          <p className="m-0 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.ai.loading}
          </p>
        </div>
      ) : null}

      {!loading && emptySuccess ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          role="status"
          data-testid="ai-empty-success"
        >
          <h2 className="text-headline m-0">{messages.ai.emptyTitle}</h2>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.ai.emptyBody}
          </p>
          <Link
            to="/explore"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
            data-testid="ai-empty-explore"
          >
            {messages.ai.exploreCta}
          </Link>
        </div>
      ) : null}

      {!loading && providerFail ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          role="alert"
          data-testid="ai-provider-fail"
        >
          <h2 className="text-headline m-0">{messages.ai.failTitle}</h2>
          <p
            className="mt-2 text-body-sm text-[var(--color-muted-foreground)]"
            data-testid="ai-provider-fail-message"
          >
            {providerFail}
          </p>
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.ai.failBody}
          </p>
          <Link
            to="/explore"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] no-underline"
            data-testid="ai-fail-explore"
          >
            {messages.ai.exploreCta}
          </Link>
        </div>
      ) : null}

      {!loading && Array.isArray(results) && results.length > 0 ? (
        <section
          className="mt-10"
          aria-labelledby="ai-results-heading"
          data-testid="ai-results"
        >
          <h2 id="ai-results-heading" className="text-display-sm m-0">
            {messages.ai.resultsTitle}
          </h2>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {messages.ai.resultsSubtitle}
          </p>
          <ul
            className="mt-8 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="ai-results-list"
          >
            {results.map((item) => (
              <RecommendationCard key={item.id} recommendation={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
