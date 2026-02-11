import Link from "next/link";
import { toolkitCards, type ToolkitCardItem } from "../../content/marketing";

const ToolkitCard = ({ card }: { card: ToolkitCardItem }) => (
  <article className="feature-card">
    <div className="feature-card__visual">
      <p className="eyebrow">Placeholder</p>
      <p className="muted">Swap in the real UI later.</p>
    </div>
    <h3>{card.title}</h3>
    <p className="muted">{card.body}</p>
    <Link className="link-ghost" href="/register">
      Learn more
    </Link>
  </article>
);

export const ToolkitSection = () => (
  <section className="section section--padded" id="toolkit">
    <div className="container stack">
      <div className="section__header">
        <h2>Executive functioning&apos;s favourite toolkit</h2>
        <p className="lede">
          Benefit-first cards that map to your real workflows: assessment, meetings, contributions, and permissions.
        </p>
      </div>
      <div className="card-grid">
        {toolkitCards.map((card) => (
          <ToolkitCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  </section>
);
