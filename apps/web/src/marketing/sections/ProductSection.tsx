import Link from "next/link";
import { MarketingPicture } from "./MarketingPicture";

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
      <div className="split__visual split__visual--frame" data-reveal>
        <div className="split__visual-media">
          <MarketingPicture
            index={1}
            alt="Team Feedback dashboard shown in a MacBook mockup"
            pictureClassName="split__visual-picture"
            imageClassName="split__visual-image split__visual-image--product"
          />
        </div>
      </div>
    </div>
  </section>
);
