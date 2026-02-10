export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  
  return date.toLocaleDateString("en-GB", options);
}
