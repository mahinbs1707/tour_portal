/** Asia/Dhaka submission time, matching the business timezone. */
/** ``datetime-local`` value (Asia/Dhaka) → ISO for the extend API. */
export function deadlineLocalToIso(localValue) {
  if (!localValue) {
    return "";
  }
  return new Date(`${localValue}:00+06:00`).toISOString();
}

export function formatSubmittedAt(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return String(iso);
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
