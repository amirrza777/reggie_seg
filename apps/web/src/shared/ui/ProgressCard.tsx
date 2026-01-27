import Link from "next/link";
import type { ReactNode } from "react";

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
        </div>
        <div style={{ textAlign: "right" }}>
          <strong>{pct}%</strong>
        </div>
      </div>
      <div className="card__body" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            width: "100%",
            height: 10,
            borderRadius: 999,
            background: "var(--accent-soft)",
            overflow: "hidden",
            border: "1px solid var(--accent-border)",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "var(--accent)",
              transition: "width 0.2s ease",
            }}
          />
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
