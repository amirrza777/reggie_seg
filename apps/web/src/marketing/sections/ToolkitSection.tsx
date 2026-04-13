import Link from "next/link";
import { toolkitCards, type ToolkitCardItem } from "@/marketing/content/marketing";
import { MarketingPicture } from "./MarketingPicture";

const ToolkitCard = ({ card, imageIndex }: { card: ToolkitCardItem; imageIndex: number }) => (
  <article className="feature-card" data-reveal>
    <div className="feature-card__visual">
      <MarketingPicture
        index={imageIndex}
        alt={`${card.title} interface preview`}
        pictureClassName="feature-card__picture"
        imageClassName="feature-card__image"
      />
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
      <div className="section__header" data-reveal>
        <h2>Executive functioning&apos;s favourite toolkit</h2>
        <p className="lede">
          Benefit-first cards that map to your real workflows: assessment, meetings, contributions, and permissions.
        </p>
      </div>
      <div className="card-grid" data-reveal-group>
        {toolkitCards.map((card, index) => (
          <ToolkitCard key={card.title} card={card} imageIndex={index + 6} />
        ))}
      </div>
    </div>
  </section>
);
