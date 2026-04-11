// Formats chart X-axis timestamps with shared date formatting.

import { formatDate } from "@/shared/lib/formatDate";

export function formatTrelloTimeTick(value: number) {
  return formatDate(new Date(value).toISOString().slice(0, 10));
}
