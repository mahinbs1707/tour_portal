import { useCallback, useEffect, useId, useRef, useState } from "react";
import { messages } from "../../i18n/messages.js";
import { ApiError } from "../../services/apiClient.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import {
  clearAdminPackageCover,
  getAdminPackage,
  removeAdminPackageAdditional,
  uploadAdminPackageAdditional,
  uploadAdminPackageCover,
} from "./packagesApi.js";

const ACCEPT = "image/jpeg,image/png,image/webp";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60";

function isAllowedFile(file) {
  return file && ALLOWED.has(file.type);
}

/**
 * Admin cover + additional image management for an existing package (Story 2.3).
 */
export function AdminPackageMediaPanel({ packageId }) {
  const coverInputId = useId();
  const additionalInputId = useId();
  const coverInputRef = useRef(null);
  const additionalInputRef = useRef(null);
  const [coverImage, setCoverImage] = useState("");
  const [additionalImages, setAdditionalImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyMode, setBusyMode] = useState(null); // 'upload' | 'mutate' | null
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // 'clear-cover' | { remove: index }

  const busy = busyMode != null;
  const busyUploadLabel = messages.packages.mediaUploading;
  const busyMutateLabel = messages.packages.mediaWorking;

  const applyPackage = useCallback((pkg) => {
    setCoverImage(pkg?.cover_image || "");
    setAdditionalImages(
      Array.isArray(pkg?.additional_images) ? pkg.additional_images : [],
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = Symbol(packageId);
    let activeRequest = requestId;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const pkg = await getAdminPackage(packageId);
        if (cancelled || activeRequest !== requestId) {
          return;
        }
        applyPackage(pkg);
      } catch (err) {
        if (cancelled || activeRequest !== requestId) {
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : messages.packages.errors.generic,
        );
        setCoverImage("");
        setAdditionalImages([]);
      } finally {
        if (!cancelled && activeRequest === requestId) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      activeRequest = Symbol("cancelled");
    };
  }, [packageId, applyPackage]);

  function apiErrorMessage(err) {
    if (!(err instanceof ApiError)) {
      return messages.packages.errors.generic;
    }
    return (
      err.nonFieldErrors?.[0] ||
      Object.values(err.fieldErrors || {}).flat()[0] ||
      err.message
    );
  }

  async function handleCoverChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) {
      return;
    }
    if (!isAllowedFile(file)) {
      setError(messages.packages.errors.mediaType);
      return;
    }
    setBusyMode("upload");
    setError("");
    try {
      const pkg = await uploadAdminPackageCover(packageId, file);
      applyPackage(pkg);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyMode(null);
    }
  }

  async function runClearCover() {
    setConfirm(null);
    if (busy || !coverImage) {
      return;
    }
    setBusyMode("mutate");
    setError("");
    try {
      const pkg = await clearAdminPackageCover(packageId);
      applyPackage(pkg);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyMode(null);
    }
  }

  async function handleAdditionalChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) {
      return;
    }
    if (!isAllowedFile(file)) {
      setError(messages.packages.errors.mediaType);
      return;
    }
    setBusyMode("upload");
    setError("");
    try {
      const pkg = await uploadAdminPackageAdditional(packageId, file);
      applyPackage(pkg);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyMode(null);
    }
  }

  async function runRemoveAdditional(index) {
    setConfirm(null);
    if (busy) {
      return;
    }
    setBusyMode("mutate");
    setError("");
    try {
      const pkg = await removeAdminPackageAdditional(packageId, index);
      applyPackage(pkg);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyMode(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-8 text-[var(--color-muted-foreground)]" aria-busy="true">
        {messages.packages.loading}
      </p>
    );
  }

  return (
    <section className="mt-10" data-testid="admin-package-media">
      <h2 className="text-title m-0">{messages.packages.mediaTitle}</h2>
      <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.packages.mediaSubtitle}
      </p>
      <p className="mt-1 text-body-sm text-[var(--color-muted-foreground)]">
        {messages.packages.mediaHint}
      </p>

      {error ? (
        <p
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-3 py-2 text-body-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <h3 className="text-label m-0">{messages.packages.mediaCoverLabel}</h3>
        {coverImage ? (
          <div className="mt-3">
            <img
              src={coverImage}
              alt={messages.packages.mediaCoverAlt}
              className="max-h-48 max-w-full object-contain"
              data-testid="admin-package-cover-preview"
            />
            <p className="mt-2 break-all text-body-sm text-[var(--color-muted-foreground)]">
              {coverImage}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.packages.mediaCoverEmpty}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={coverInputRef}
            id={coverInputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            data-testid="admin-package-cover-input"
            aria-label={messages.packages.fields.coverFile}
            disabled={busy}
            onChange={handleCoverChange}
          />
          <button
            type="button"
            className={primaryButtonClass}
            disabled={busy}
            data-testid="admin-package-cover-upload"
            onClick={() => coverInputRef.current?.click()}
          >
            {busyMode === "upload"
              ? busyUploadLabel
              : messages.packages.mediaUploadCover}
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={busy || !coverImage}
            data-testid="admin-package-cover-clear"
            onClick={() => setConfirm("clear-cover")}
          >
            {busyMode === "mutate"
              ? busyMutateLabel
              : messages.packages.mediaClearCover}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-label m-0">
          {messages.packages.mediaAdditionalLabel}
        </h3>
        {additionalImages.length === 0 ? (
          <p className="mt-2 text-body-sm text-[var(--color-muted-foreground)]">
            {messages.packages.mediaAdditionalEmpty}
          </p>
        ) : (
          <ul className="mt-3 list-none space-y-3 p-0" data-testid="admin-package-additional-list">
            {additionalImages.map((url, index) => (
              <li
                key={`${url}-${index}`}
                className="flex flex-wrap items-start gap-3"
                data-testid={`admin-package-additional-item-${index}`}
              >
                <img
                  src={url}
                  alt={messages.packages.mediaAdditionalAlt.replace(
                    "{index}",
                    String(index + 1),
                  )}
                  className="max-h-24 max-w-[10rem] object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 break-all text-body-sm text-[var(--color-muted-foreground)]">
                    {url}
                  </p>
                  <button
                    type="button"
                    className={`${buttonClass} mt-2`}
                    disabled={busy}
                    data-testid={`admin-package-additional-remove-${index}`}
                    onClick={() => setConfirm({ remove: index })}
                  >
                    {busyMode === "mutate"
                      ? busyMutateLabel
                      : messages.packages.mediaRemoveAdditional}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <input
            ref={additionalInputRef}
            id={additionalInputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            data-testid="admin-package-additional-input"
            aria-label={messages.packages.fields.additionalFile}
            disabled={busy || additionalImages.length >= 8}
            onChange={handleAdditionalChange}
          />
          <button
            type="button"
            className={primaryButtonClass}
            disabled={busy || additionalImages.length >= 8}
            data-testid="admin-package-additional-upload"
            onClick={() => additionalInputRef.current?.click()}
          >
            {busyMode === "upload"
              ? busyUploadLabel
              : messages.packages.mediaUploadAdditional}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "clear-cover"}
        title={messages.packages.confirmClearCoverTitle}
        body={messages.packages.confirmClearCoverBody}
        confirmLabel={messages.packages.mediaClearCover}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={runClearCover}
      />
      <ConfirmDialog
        open={typeof confirm === "object" && confirm?.remove != null}
        title={messages.packages.confirmRemoveAdditionalTitle}
        body={messages.packages.confirmRemoveAdditionalBody}
        confirmLabel={messages.packages.mediaRemoveAdditional}
        cancelLabel={messages.packages.cancel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runRemoveAdditional(confirm.remove)}
      />
    </section>
  );
}
