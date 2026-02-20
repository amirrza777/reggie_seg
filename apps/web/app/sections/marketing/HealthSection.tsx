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
      <div className="split__visual split__visual--soft" data-reveal data-reveal-offset="-25%">
        <div className="visual-placeholder">
          <p className="eyebrow">Analytics</p>
          <p className="muted">Slot in your analytics dashboard or trend lines.</p>
        </div>
      </div>
    </div>
  </section>
);
