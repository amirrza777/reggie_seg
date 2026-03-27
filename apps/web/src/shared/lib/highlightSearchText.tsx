import { Fragment, type ReactNode } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightSearchText(text: string, query?: string): ReactNode {
  const terms = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;

  const lowerTerms = new Set(terms.map((term) => term.toLowerCase()));
  return parts.map((part, index) =>
    lowerTerms.has(part.toLowerCase()) ? (
      <mark key={`hit-${index}`} className="staff-projects__search-hit">
        {part}
      </mark>
    ) : (
      <Fragment key={`txt-${index}`}>{part}</Fragment>
    ),
  );
}
