/**
 * Pay now is shown only when the API reports payment eligibility (Story 7.2).
 */
export function canPayNow(booking) {
  return Boolean(booking?.payment_eligible);
}