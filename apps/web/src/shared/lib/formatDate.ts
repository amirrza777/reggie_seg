const DEFAULT_LOCALE = "en-US";

export function formatDate(input: Date | string, locale = DEFAULT_LOCALE) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
