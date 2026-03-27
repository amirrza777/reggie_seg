import Link from "next/link";
import type { FooterLinkCategory, FooterLinkPageContent } from "./footerLinkPages";

const sectionEyebrow: Record<FooterLinkCategory, string> = {
  product: "Product",
  resources: "Resources",
  integrations: "Integrations",
};

export function FooterLinkDescriptionPage({
  category,
  page,
}: {
  category: FooterLinkCategory;
  page: FooterLinkPageContent;
}) {
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
            <Link href="/" className="btn btn--ghost">
              Back to homepage
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
    </>
  );
}
