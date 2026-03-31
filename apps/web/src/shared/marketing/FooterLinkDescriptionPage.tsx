import Link from "next/link";
import type { FooterLinkCategory, FooterLinkPageContent } from "./footerLinkPages";

const sectionEyebrow: Record<FooterLinkCategory, string> = {
  product: "Product",
  resources: "Resources",
  integrations: "Integrations",
};

type BottomCtaCopy = {
  title: string;
  description: string;
};

const bottomCtaCopyByPageKey: Record<string, BottomCtaCopy> = {
  "product/peer-assessment": {
    title: "Launch stronger peer assessment cycles",
    description:
      "Set clear deadlines, use shared criteria, and give every team consistent feedback workflows from one place.",
  },
  "product/questionnaires": {
    title: "Standardize team check-ins with better questionnaires",
    description:
      "Reuse proven question sets and keep responses organized so staff can monitor module progress without manual admin overhead.",
  },
  "product/meetings": {
    title: "Keep team meetings visible and accountable",
    description:
      "Track attendance, outcomes, and follow-up actions so meetings translate into clear project progress each week.",
  },
  "product/integrations": {
    title: "Connect delivery tools to your teaching workflow",
    description:
      "Unify activity signals, assessment context, and team coordination so staff decisions are based on complete project data.",
  },
  "product/roles-and-permissions": {
    title: "Apply role permissions with confidence",
    description:
      "Give staff and students the right level of access while protecting core workflows and reducing accidental configuration changes.",
  },
  "product/analytics": {
    title: "Turn module analytics into earlier interventions",
    description:
      "Spot engagement and delivery risks sooner, then act with clear evidence across teams, projects, and feedback cycles.",
  },
  "resources/guides": {
    title: "Put practical guides into action this term",
    description:
      "Use implementation playbooks to launch cleaner cycles, improve completion rates, and run team-based modules consistently.",
  },
  "resources/templates": {
    title: "Roll out faster with reusable templates",
    description:
      "Start from proven structures for questionnaires, meetings, and review windows so each cohort begins with a solid baseline.",
  },
  "resources/faq": {
    title: "Resolve setup questions before they block delivery",
    description:
      "Give staff and students quick answers on workflows, access, and integrations so your next cycle starts smoothly.",
  },
  "integrations/github": {
    title: "Bring GitHub delivery signals into team review cycles",
    description:
      "Connect repository activity to assessment and coordination context so staff can support teams with better timing and clarity.",
  },
  "integrations/trello": {
    title: "Sync Trello progress with module accountability",
    description:
      "Pair board movement with meeting and feedback workflows so project momentum is visible across supervisors and teams.",
  },
  "integrations/vle": {
    title: "Plan VLE integration with a clear rollout path",
    description:
      "Define ownership, data flow, and governance early so VLE connectivity can be introduced safely across active modules.",
  },
};

function getBottomCtaContent(category: FooterLinkCategory, page: FooterLinkPageContent) {
  const key = `${category}/${page.slug}`;
  const copy = bottomCtaCopyByPageKey[key] ?? {
    title: `Take ${page.label} live across your next cohort`,
    description:
      "Bring this workflow into one shared workspace so staff and students can coordinate delivery with less manual overhead.",
  };

  return {
    ...copy,
    ctaLabel: page.primaryCtaLabel,
    ctaHref: page.primaryCtaHref,
  };
}

export function FooterLinkDescriptionPage({
  category,
  page,
}: {
  category: FooterLinkCategory;
  page: FooterLinkPageContent;
}) {
  const bottomCta = getBottomCtaContent(category, page);

  return (
    <>
      <section className="section section--padded footer-link-page">
        <div className="container footer-link-page__hero" data-reveal-group>
          <p className="eyebrow">{sectionEyebrow[category]}</p>
          <h1 className="footer-link-page__title">{page.title}</h1>
          <p className="lede footer-link-page__lede">{page.description}</p>
          <div className="hero__cta-row footer-link-page__actions">
            <Link href={page.primaryCtaHref} className="btn btn--primary">
              {page.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="section footer-link-page__details">
        <div className="container footer-link-page__grid">
          {page.points.map((point) => (
            <article key={point.title} className="footer-link-page__card">
              <h2 className="footer-link-page__card-title">{point.title}</h2>
              <p className="footer-link-page__card-copy">{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--gradient footer-link-page__cta-band">
        <div className="container footer-link-page__cta-inner" data-reveal-group>
          <div className="footer-link-page__cta-content" data-reveal>
            <h2 className="display hero__headline footer-link-page__cta-title">{bottomCta.title}</h2>
            <p className="lede footer-link-page__cta-copy">{bottomCta.description}</p>
          </div>
          <div className="hero__cta-row footer-link-page__cta-actions" data-reveal>
            <Link className="btn btn--primary" href={bottomCta.ctaHref}>
              {bottomCta.ctaLabel}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
