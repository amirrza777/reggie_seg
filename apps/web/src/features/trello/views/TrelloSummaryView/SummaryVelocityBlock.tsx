import type { VelocityStats } from "@/features/trello/lib/velocity";

type Props = { velocity: VelocityStats };

export function SummaryVelocityBlock({ velocity }: Props) {
  const changeLabel =
    velocity.percentChange === null
      ? "—"
      : velocity.percentChange >= 0
        ? `+${velocity.percentChange}%`
        : `${velocity.percentChange}%`;

  return (
    <section className="placeholder stack">
      <h2 className="eyebrow">Velocity</h2>
      <p className="muted">Pace of cards being completed, per week.</p>
      <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li>
          <span className="muted">This week </span>
          <strong>{velocity.thisWeek}</strong>
        </li>
        <li>
          <span className="muted">Last week </span>
          <strong>{velocity.lastWeek}</strong>
        </li>
        <li>
          {velocity.percentChange !== null && (
            <span className={`pill ${velocity.percentChange < 0 ? "pill-amber" : "pill-green"}`}>
              {changeLabel}
            </span>
          )}
        </li>
      </ul>
    </section>
  );
}
