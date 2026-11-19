/** Format custom tour travel dates for display (Story 8.2). */
export function formatCustomTourDateRange(start, end) {
  if (!start) {
    return "";
  }
  if (!end || end === start) {
    return start;
  }
  return `${start} – ${end}`;
}