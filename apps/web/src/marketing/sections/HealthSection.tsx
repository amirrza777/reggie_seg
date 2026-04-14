import { MarketingPicture } from "./MarketingPicture";

export const HealthSection = () => (
  <section className="section section--muted" id="health">
    <div className="container split split--center" data-reveal-group>
      <div className="split__content split__content--stack" data-reveal>
        <p className="eyebrow">Monitoring</p>
        <h2>Track team health and learning over time</h2>
        <p className="lede">
          Dashboards show attendance, submissions, contribution signals, peer feedback trends, and flags for teams that
          need support. Archive every cycle for auditability.
        </p>
        <p className="muted">
          Automated monitoring, data archiving, marking support, and formative feedback summaries sit in one place so
          staff can intervene early.
        </p>
      </div>
      <div className="split__visual split__visual--soft" data-reveal>
        <div className="split__visual-media">
          <MarketingPicture
            index={5}
            alt="Analytics dashboard with team health trends"
            pictureClassName="split__visual-picture"
            imageClassName="split__visual-image"
          />
        </div>
      </div>
    </div>
  </section>
);
