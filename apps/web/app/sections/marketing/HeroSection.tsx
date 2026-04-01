import Link from "next/link";

export const HeroSection = () => (
  <section className="section hero hero--gradient" id="hero">
    <div className="container hero__centerpiece" data-reveal>
      <h1
        className="display hero__headline hero-enter"
        style={{ "--hero-delay": "80ms" } as React.CSSProperties}
      >
        A platform built for group work.
      </h1>
      <p className="hero__lede hero-enter" style={{ "--hero-delay": "160ms" } as React.CSSProperties}>
        Run peer assessment exercises with reusable questionnaires, meeting tracking, code contribution insights, and
        integrations that reduce admin work for students and staff.
      </p>
      <div
        className="hero__cta-row hero__cta-row--hero hero-enter"
        style={{ "--hero-delay": "240ms" } as React.CSSProperties}
      >
        <Link className="btn btn--primary" href="/register">
          Get started today
        </Link>
      </div>
    </div>
  </section>
);
