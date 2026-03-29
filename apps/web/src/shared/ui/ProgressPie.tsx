import type { CSSProperties } from "react";

type ProgressPieProps = {
  value: number; /** 0–100 */
  title: string;
  tooltip: string;
};

export function ProgressPie({ value, title, tooltip }: ProgressPieProps) {
  const p = Math.min(100, Math.max(0, Math.round(value)));
  const sliceStyle = { "--circular-progress-p": String(p) } as CSSProperties;

  return (
    <div
      className="circular-progress-pie"
      title={tooltip}
      role="img"
      aria-label={`${title}: ${p} percent. ${tooltip}`}
    >
      <div className="circular-progress-pie__ring" style={sliceStyle}>
        <div className="circular-progress-pie__inner">
          <span className="circular-progress-pie__pct">{p}%</span>
        </div>
      </div>
      <span className="circular-progress-pie__title">{title}</span>
    </div>
  );
}
