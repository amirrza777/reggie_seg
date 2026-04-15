import type { ReactNode } from "react";

/** Renders plain text with @mentions highlighted (same rules as team meeting comments). */
export function renderMeetingCommentContent(content: string): ReactNode {
  const parts = content.split(/(@\p{L}+(?:\s+\p{L}+)?)/gu);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="mention-node">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
