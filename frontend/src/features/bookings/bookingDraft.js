/**
 * Tab/session-scoped booking draft (Story 5.2).
 * Keyed by package id. Holds contact PII (name/email/phone) in sessionStorage
 * for re-auth restore — never stores passwords.
 */

const KEY_PREFIX = "tour-portal:booking-draft:";

const DRAFT_FIELDS = [
  "available_date_id",
  "travelers",
  "contact_name",
  "contact_email",
  "contact_phone",
  "additional_requirements",
];

export function bookingDraftKey(packageId) {
  return `${KEY_PREFIX}${packageId}`;
}

/** Persist only non-sensitive draft fields for a package. */
export function saveBookingDraft(packageId, fields) {
  if (!packageId || typeof sessionStorage === "undefined") {
    return;
  }
  const draft = {};
  for (const key of DRAFT_FIELDS) {
    if (fields[key] !== undefined && fields[key] !== null) {
      draft[key] = fields[key];
    }
  }
  try {
    sessionStorage.setItem(bookingDraftKey(packageId), JSON.stringify(draft));
  } catch {
    // Quota / private mode — draft restore is best-effort.
  }
}

/** Read a previously saved draft, or null. */
export function loadBookingDraft(packageId) {
  if (!packageId || typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(bookingDraftKey(packageId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const draft = {};
    for (const key of DRAFT_FIELDS) {
      if (parsed[key] !== undefined && parsed[key] !== null) {
        draft[key] = parsed[key];
      }
    }
    return Object.keys(draft).length > 0 ? draft : null;
  } catch {
    return null;
  }
}

/** Clear draft after successful submit (or when package becomes unavailable). */
export function clearBookingDraft(packageId) {
  if (!packageId || typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(bookingDraftKey(packageId));
  } catch {
    // ignore
  }
}
