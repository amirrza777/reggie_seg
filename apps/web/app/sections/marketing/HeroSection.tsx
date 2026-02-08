import Link from "next/link";

export const HeroSection = () => (
  <section className="section hero hero--gradient" id="hero">
    <div className="container hero__centerpiece" data-reveal>
      <p className="eyebrow">Team feedback platform</p>
      <h1 className="display hero__headline">A platform built for group work.</h1>
      <p className="hero__lede">
        Run peer assessment exercises with reusable questionnaires, meeting tracking, code contribution insights, and
        integrations that reduce admin work for students and staff.
      </p>
      <div className="hero__cta-row hero__cta-row--hero">
        <Link className="btn btn--primary" href="/register">
          Get started today
        </Link>
      </div>
      <p className="hero__availability">Works with GitHub. Optional Trello integration. Built for GDPR.</p>
    </div>
  </section>
);
