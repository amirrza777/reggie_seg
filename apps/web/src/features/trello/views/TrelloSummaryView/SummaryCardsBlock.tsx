import type { CardCountByStatus } from "@/features/trello/lib/velocity";

type Props = { counts: CardCountByStatus };

export function SummaryCardsBlock({ counts }: Props) {
  return (
    <section className="placeholder stack">
      <h2 className="eyebrow">Cards</h2>
      <p>
        <span className="muted" style={{ display: "block"}}>
          Number of cards (total)
        </span>
        <span className="display">
          {counts.total}
        </span>
      </p>
      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--border)" }} />
      <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }}>
        <li>
          <span className="muted">Backlog </span>
          <strong>{counts.backlog}</strong>
        </li>
        <li>
          <span className="muted">In progress </span>
          <strong>{counts.inProgress}</strong>
        </li>
        <li>
          <span className="muted">Completed </span>
          <strong>{counts.completed}</strong>
        </li>
        <li>
          <span className="muted">Information only </span>
          <strong>{counts.informationOnly}</strong>
        </li>
      </ul>
    </section>
  );
}
