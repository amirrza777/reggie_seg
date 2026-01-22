import { MarketingLayout } from "./layouts/marketing";

export default function HomePage() {
  return (
    <MarketingLayout>
      <section className="section section--padded section--gradient hero" id="hero">
        <div className="container hero__grid">
          <div className="stack">
            <span className="hero__kicker">Team feedback platform</span>
            <h1 className="hero__title">Structured feedback for every project team.</h1>
            <p className="lede">
              Collect reflections, peer reviews, and facilitator notes in one place. Built to
              mirror King&apos;s College London&apos;s Team Feedback workflow so students and
              supervisors stay aligned.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#cta">
                Start a team review
              </a>
              <a className="link-ghost" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="hero__meta">
              <span>• Module and cohort level views</span>
              <span>• Peer + facilitator perspectives</span>
              <span>• Actionable follow-ups</span>
            </div>
          </div>
          <div className="hero__visual">
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <p className="eyebrow">Placeholder</p>
              <h3>Team feedback snapshot</h3>
              <p className="muted">Drop screenshots of dashboards or forms here later.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="awards">
        <div className="container trust">
          <p className="eyebrow">Trusted by teaching teams</p>
          <div className="trust__logos">
            <span>KCL</span>
            <span>UCL</span>
            <span>Imperial</span>
            <span>Queen Mary</span>
            <span>Warwick</span>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container split">
          <div className="split__visual">
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow">Placeholder</p>
              <h3>Feedback cycle</h3>
              <p className="muted">Drop a visual of the team feedback cycle here.</p>
            </div>
          </div>
          <div className="split__content">
            <p className="eyebrow">Based on KCL team feedback</p>
            <h2>A clear path from feedback to action.</h2>
            <p className="lede">
              Capture individual reflections, peer evaluations, and facilitator assessments.
              Align on team agreements, highlight strengths, and track agreed actions across
              milestones.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#cta">
                Run a review
              </a>
              <a className="link-ghost" href="#faq">
                View the flow
              </a>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
