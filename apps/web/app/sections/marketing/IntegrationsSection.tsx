import Link from "next/link";

export const IntegrationsSection = () => (
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
          Connect GitHub for contribution tracking. Optionally link Trello for project progress signals. Keep everything
          tied to modules, teams, and assessment cycles.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--ghost" href="/register">
            How integrations work
          </Link>
        </div>
      </div>
    </div>
  </section>
);
