import Link from "next/link";
import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

export type ProgressCardData = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
  deadline?: string;
  deadlineDetail?: ReactNode;  // Rich deadline content (e.g. date + profile chip); takes precedence over `deadline`. 
  flagged?: boolean;
};

type ProgressCardProps = ProgressCardData & {
  href?: string;
  action?: ReactNode;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function ProgressCard({
  title,
  submitted,
  expected,
  deadline,
  deadlineDetail,
  flagged,
  href,
  action,
}: ProgressCardProps) {
  const progress = expected > 0 ? (submitted / expected) * 100 : 0;
  const pct = clamp(progress);
  const content = (
    <div className="card" style={{ height: "100%", borderColor: flagged ? "var(--color-danger, #e53e3e)" : undefined }}>
      <div className="card__header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div className="eyebrow">Progress</div>
            {flagged && (
              <span
                style={{
                  fontSize: "var(--fs-fixed-0-7rem)",
                  fontWeight: 600,
                  color: "var(--color-fixed-fff)",
                  background: "var(--color-danger, #e53e3e)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  lineHeight: 1.4,
                }}
              >
                Not submitted
              </span>
            )}
          </div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {deadlineDetail != null ? (
            <div className="muted" style={{ margin: "6px 0 0" }}>
              {deadlineDetail}
            </div>
          ) : (
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {deadline ?? "Deadline not set"}
            </p>
          )}
          <p> {submitted}/{expected} assessments submitted </p>
        </div>
      </div>
      <div className="card__body" style={{ display: "grid", gap: 10 }}>
        <ProgressBar value={pct} />
        <div className="progress-bar__label">
          <strong>{Math.round(pct)}%</strong>
        </div>
        {action}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          height: "100%",
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}