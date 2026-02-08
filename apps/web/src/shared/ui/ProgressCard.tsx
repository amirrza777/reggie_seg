import Link from "next/link";
import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

export type ProgressCardData = {
  id: string;
  title: string;
  progress: number;
  subtitle?: string;
};

type ProgressCardProps = ProgressCardData & {
  href?: string;
  action?: ReactNode;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function ProgressCard({ title, progress, subtitle, href, action }: ProgressCardProps) {
  const pct = clamp(progress);
  const content = (
    <div className="card" style={{ height: "100%" }}>
      <div className="card__header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Progress
          </div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle ? <p className="muted" style={{ margin: "6px 0 0" }}>{subtitle}</p> : null}
          <p> 14/60 assessments submitted </p>
          <p> 12D:4H to deadline</p>
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
