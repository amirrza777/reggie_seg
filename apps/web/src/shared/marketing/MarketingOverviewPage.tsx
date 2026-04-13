import Link from "next/link";

export type MarketingOverviewCard = {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
};

export type MarketingOverviewPageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  sectionTitle: string;
  sectionDescription: string;
  cards: MarketingOverviewCard[];
  bottomCtaTitle: string;
  bottomCtaDescription: string;
  bottomCtaLabel: string;
  bottomCtaHref: string;
};

export function MarketingOverviewPage({ page }: { page: MarketingOverviewPageContent }) {
  return (
    <>
      <section className="section section--padded">
        <div className="container footer-link-page__hero" data-reveal-group>
          <p className="eyebrow" data-reveal>{page.eyebrow}</p>
          <h1 className="display footer-link-page__title" data-reveal>{page.title}</h1>
          <p className="lede footer-link-page__lede" data-reveal>{page.description}</p>
          <div className="hero__cta-row footer-link-page__actions" data-reveal>
            <Link href={page.primaryCtaHref} className="btn btn--primary">
              {page.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="section footer-link-page__details">
        <div className="container stack" data-reveal-group>
          <div className="section__header" data-reveal>
            <h2>{page.sectionTitle}</h2>
            <p className="lede">{page.sectionDescription}</p>
          </div>
          <div className="footer-link-page__grid">
            {page.cards.map((card) => (
              <article key={card.title} className="footer-link-page__card" data-reveal>
                <h3 className="footer-link-page__card-title">{card.title}</h3>
                <p className="footer-link-page__card-copy">{card.description}</p>
                <Link href={card.href} className="link-ghost">
                  {card.linkLabel}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--gradient footer-link-page__cta-band">
        <div className="container footer-link-page__cta-inner" data-reveal-group>
          <div className="footer-link-page__cta-content" data-reveal>
            <h2 className="display hero__headline footer-link-page__cta-title">{page.bottomCtaTitle}</h2>
            <p className="lede footer-link-page__cta-copy">{page.bottomCtaDescription}</p>
          </div>
          <div className="hero__cta-row footer-link-page__cta-actions" data-reveal>
            <Link className="btn btn--primary" href={page.bottomCtaHref}>
              {page.bottomCtaLabel}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
