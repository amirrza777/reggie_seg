const DEFAULT_LOCALE = "en-US";

export function formatDate(input: Date | string | null | undefined, locale = DEFAULT_LOCALE): string {
  if (input == null || input === "") {return "";}
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {return "";}
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
