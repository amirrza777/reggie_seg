import Link from "next/link";

export const ProductSection = () => (
  <section className="section" id="product">
    <div className="container split split--center" data-reveal-group>
      <div className="split__content split__content--stack" data-reveal>
        <p className="eyebrow">Automation + structure</p>
        <h2>The feedback cycle that actually runs itself</h2>
        <p className="lede">
          Create an assessment cycle in minutes. Reuse questionnaires, schedule deadlines, collect submissions, generate
          summaries, and surface risks early, without chasing people.
        </p>
        <p className="muted">
          Includes custom peer assessments, a questionnaire repository, monitoring, marking and formative support, plus
          archiving to keep every cohort auditable.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--ghost" href="/register">
            How automation supports modules
          </Link>
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
);
