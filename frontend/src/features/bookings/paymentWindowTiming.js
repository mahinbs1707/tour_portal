/** Remaining ms until payment deadline (client clock). */
export function msUntilDeadline(deadlineIso) {
  if (!deadlineIso) {
    return 0;
  }
  const end = new Date(deadlineIso).getTime();
  if (Number.isNaN(end)) {
    return 0;
  }
  return end - Date.now();
}

/** Human-readable remaining time for countdown UI (English MVP). */
export function formatTimeRemaining(ms) {
  if (ms <= 0) {
    return "";
  }
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

export function shouldShowPaymentCountdown(booking) {
  if (!booking?.payment_window_deadline_at) {
    return false;
  }
  if (booking.status !== "APPROVED") {
    return false;
  }
  if (booking.payment_status === "SUCCESS") {
    return false;
  }
  if (booking.payment_window_status === "NOT_OPEN") {
    return false;
  }
  return msUntilDeadline(booking.payment_window_deadline_at) > 0;
}

export function isPaymentWindowExpired(booking) {
  if (!booking) {
    return false;
  }
  if (booking.payment_window_status === "EXPIRED") {
    return true;
  }
  if (
    booking.payment_window_deadline_at &&
    msUntilDeadline(booking.payment_window_deadline_at) <= 0
  ) {
    return true;
  }
  if (
    booking.status === "APPROVED" &&
    booking.payment_eligible === false &&
    booking.payment_window_status === "OPEN" &&
    booking.payment_window_deadline_at
  ) {
    return true;
  }
  return false;
}