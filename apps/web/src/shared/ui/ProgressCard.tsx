import Link from "next/link";
import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

export type ProgressCardData = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
  deadline?: string;
};

type ProgressCardProps = ProgressCardData & {
  href?: string;
  action?: ReactNode;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function ProgressCard({ title, submitted, expected, deadline, href, action }: ProgressCardProps) {
  const progress = expected > 0 ? (submitted / expected) * 100 : 0;
  const pct = clamp(progress);
  const content = (
    <div className="card" style={{ height: "100%" }}>
      <div className="card__header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Progress
          </div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p className="muted" style={{ margin: "6px 0 0" }}>{deadline ?? "12D:4H to deadline"}</p>
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
