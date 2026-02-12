import Link from "next/link";

export const CtaSection = () => (
  <section className="section section--gradient cta-band" id="cta">
    <div className="container cta-band__inner cta-band__inner--centered">
      <div id="demo" />
      <div className="cta-band__content" data-reveal>
        <h2 className="display hero__headline cta-band__title">Run better group projects</h2>
        <p className="lede">
          Launch a peer assessment cycle, track meetings, and monitor progress from one place. Keep every cohort
          accountable with one shared workflow.
        </p>
      </div>
      <div className="hero__cta-row" data-reveal>
        <Link className="btn btn--primary" href="/register">
          Start on web
        </Link>
      </div>
    </div>
  </section>
);
