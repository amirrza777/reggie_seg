import { MarketingLayout } from "./layouts/marketing";

const marqueeLogos = [
  { src: "/marketing-logos/logo-1.png", alt: "Logo 1" },
  { src: "/marketing-logos/logo-2.png", alt: "Logo 2" },
  { src: "/marketing-logos/logo-3.png", alt: "Logo 3" },
];
const marqueeLoop = (() => {
  const minCount = 20;
  if (marqueeLogos.length === 0) {
    return [];
  }
  const repeated: typeof marqueeLogos = [];
  while (repeated.length < minCount) {
    repeated.push(...marqueeLogos);
  }
  return repeated;
})();
const marqueeItems = marqueeLoop.concat(marqueeLoop);

const toolkitCards = [
  {
    title: "Peer assessment that's fair",
    body: "Custom questionnaires, flexible scoring, anonymity options, staff visibility.",
  },
  {
    title: "Meetings that don't get lost",
    body: "Attendance, minutes, actions, and scheduling in one place.",
  },
  {
    title: "Contributions you can evidence",
    body: "GitHub-linked contribution insights per repo, per student, per sprint.",
  },
];

const testimonials = [
  { quote: "Finally, everyone's contribution is visible.", attribution: "Student" },
  { quote: "Setup takes minutes, and marking is faster.", attribution: "TA / lecturer" },
  { quote: "Meeting minutes and actions stopped disappearing.", attribution: "Student" },
];

const faqItems = [
  {
    question: "How does peer assessment work with custom questionnaires?",
    answer:
      "Pick a template, adjust scales and anonymity, schedule deadlines, and let students submit once while staff monitor progress.",
  },
  {
    question: "Can we reuse questionnaires across modules and years?",
    answer:
      "Yes. Save questionnaires to a shared library, version them, and reuse them across cohorts without rebuilding from scratch.",
  },
  {
    question: "What data do you pull from GitHub, and what do you not pull?",
    answer:
      "We ingest contribution metadata (commits, PRs, issues, and timestamps) and never tokens or repository secrets.",
  },
  {
    question: "Can teams self-form or be auto-allocated?",
    answer:
      "Both. Let coordinators auto-allocate by module rules or allow students to self-select into teams with approvals.",
  },
  {
    question: "How do roles and permissions work?",
    answer:
      "Grant read-only or edit access per data type (questionnaires, submissions, actions, and analytics) so supervisors, TAs, and students only see what they should.",
  },
  {
    question: "How does data archiving and GDPR compliance work?",
    answer:
      "Every cycle is archived with audit trails. Data retention rules are configurable, and exports respect GDPR requirements.",
  },
];

export default function HomePage() {
  return (
    <MarketingLayout>
      <section className="section hero hero--gradient" id="hero">
        <div className="container hero__centerpiece" data-reveal>
          <p className="eyebrow">Team feedback platform</p>
          <h1 className="display hero__headline">A platform built for group work.</h1>
          <p className="hero__lede">
            Run peer assessment exercises with reusable questionnaires, meeting tracking, code contribution insights, and
            integrations that reduce admin work for students and staff.
          </p>
          <div className="hero__cta-row hero__cta-row--hero">
            <a className="btn btn--primary" href="#cta">
              Get started today
            </a>
          </div>
          <p className="hero__availability">Works with GitHub. Optional Trello integration. Built for GDPR.</p>
        </div>
      </section>

      <section className="section" id="product">
        <div className="container split split--center" data-reveal-group>
          <div className="split__content split__content--stack" data-reveal>
            <p className="eyebrow">Automation + structure</p>
            <h2>The feedback cycle that actually runs itself</h2>
            <p className="lede">
              Create an assessment cycle in minutes. Reuse questionnaires, schedule deadlines, collect submissions,
              generate summaries, and surface risks early, without chasing people.
            </p>
            <p className="muted">
              Includes custom peer assessments, a questionnaire repository, monitoring, marking and formative support,
              plus archiving to keep every cohort auditable.
            </p>
            <div className="hero__actions">
              <a className="btn btn--ghost" href="#cta">
                How automation supports modules
              </a>
            </div>
          </div>
          <div className="split__visual split__visual--frame" data-reveal data-reveal-offset="-25%">
            <div className="visual-placeholder">
              <p className="eyebrow">Screenshot</p>
              <p className="muted">Drop your feedback cycle visual or dashboard here.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--padded trust" id="resources">
        <div className="container stack trust__wrap" data-reveal>
          <h2 className="trust__title">Trusted by teams, taught by staff</h2>
        </div>
        <div className="logo-marquee" aria-label="Partner logos" data-reveal>
          <div className="logo-marquee__track">
            {marqueeItems.map((logo, index) => {
              const isDuplicate = index >= marqueeLoop.length;
              return (
                <img
                  key={`${logo.src}-${index}`}
                  className="logo-marquee__logo"
                  src={logo.src}
                  alt={isDuplicate ? "" : logo.alt}
                  loading="lazy"
                  aria-hidden={isDuplicate}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--padded" id="toolkit">
        <div className="container stack">
          <div className="section__header" data-reveal>
            <h2>Executive functioning's favourite toolkit</h2>
            <p className="lede">
              Benefit-first cards that map to your real workflows: assessment, meetings, contributions, and permissions.
            </p>
          </div>
          <div className="card-grid">
            {toolkitCards.map((card) => (
              <article key={card.title} className="feature-card" data-reveal>
                <div className="feature-card__visual">
                  <p className="eyebrow">Placeholder</p>
                  <p className="muted">Swap in the real UI later.</p>
                </div>
                <h3>{card.title}</h3>
                <p className="muted">{card.body}</p>
                <a className="link-ghost" href="#cta">
                  Learn more
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted" id="about">
        <div className="container split split--center" data-reveal-group>
          <div className="split__content split__content--stack" data-reveal data-reveal-offset="-25%">
            <p className="eyebrow">About</p>
            <h2>Your peer assessment, finally manageable</h2>
            <p className="lede">
              Collect meaningful feedback without messy spreadsheets. Students submit once, staff review quickly, and the
              system highlights outliers, conflicts, and missing submissions.
            </p>
            <div className="hero__actions">
              <a className="btn btn--ghost" href="#product">
                How peer assessment works
              </a>
            </div>
          </div>
          <div className="split__visual split__visual--soft" data-reveal>
            <div className="visual-placeholder">
              <p className="eyebrow">Flow</p>
              <p className="muted">Add the peer assessment journey or form UI here.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="integrations">
        <div className="container split split--center" data-reveal-group>
          <div className="split__visual split__visual--frame" data-reveal>
            <div className="visual-placeholder">
              <p className="eyebrow">Integrations</p>
              <p className="muted">Show GitHub/Trello connections or sync diagram here.</p>
            </div>
          </div>
          <div className="split__content split__content--stack" data-reveal data-reveal-offset="-25%">
            <p className="eyebrow">Sync</p>
            <h2>One platform, synced with the tools you already use</h2>
            <p className="lede">
              Connect GitHub for contribution tracking. Optionally link Trello for project progress signals. Keep
              everything tied to modules, teams, and assessment cycles.
            </p>
            <div className="hero__actions">
              <a className="btn btn--ghost" href="#cta">
                How integrations work
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--muted" id="health">
        <div className="container split split--center" data-reveal-group>
          <div className="split__content split__content--stack" data-reveal>
            <p className="eyebrow">Monitoring</p>
            <h2>Track team health and learning over time</h2>
            <p className="lede">
              Dashboards show attendance, submissions, contribution signals, peer feedback trends, and flags for teams
              that need support. Archive every cycle for auditability.
            </p>
            <p className="muted">
              Automated monitoring, data archiving, marking support, and formative feedback summaries sit in one place
              so staff can intervene early.
            </p>
          </div>
          <div className="split__visual split__visual--soft" data-reveal data-reveal-offset="-25%">
            <div className="visual-placeholder">
              <p className="eyebrow">Analytics</p>
              <p className="muted">Slot in your analytics dashboard or trend lines.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section trust" id="testimonials">
        <div className="container stack">
          <div className="section__header" data-reveal>
            <h2>The feedback system teams actually complete</h2>
            <p className="lede">Clear deadlines, fewer arguments, better accountability.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.quote} className="testimonial-card" data-reveal>
                <p className="testimonial-card__quote">"{item.quote}"</p>
                <p className="testimonial-card__attribution">{item.attribution}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container stack">
          <div className="section__header" data-reveal>
            <h2>FAQ</h2>
            <p className="lede">Everything about questionnaires, permissions, GitHub data, and compliance.</p>
          </div>
          <div className="faq">
            {faqItems.map((item) => (
              <details key={item.question} className="faq__item" data-reveal>
                <summary>{item.question}</summary>
                <p className="muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--gradient cta-band" id="cta">
        <div className="container cta-band__inner">
          <div id="demo" />
          <div className="cta-band__content" data-reveal>
            <h2>Run better group projects with less admin</h2>
            <p className="lede">
              Launch a peer assessment cycle, track meetings, and monitor progress from one place.
            </p>
          </div>
          <div className="hero__cta-row" data-reveal>
            <a className="btn btn--primary" href="#cta">
              Start on web
            </a>
            <a className="btn btn--ghost" href="#demo">
              Request demo
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
