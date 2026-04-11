import Link from "next/link";
import { MarketingPicture } from "./MarketingPicture";

export const IntegrationsSection = () => (
  <section className="section" id="integrations">
    <div className="container split split--center" data-reveal-group>
      <div className="split__visual split__visual--frame" data-reveal>
        <div className="split__visual-media">
          <MarketingPicture
            index={4}
            alt="Integrations screen showing connected GitHub and Trello tools"
            pictureClassName="split__visual-picture"
            imageClassName="split__visual-image"
          />
        </div>
      </div>
      <div className="split__content split__content--stack" id="sync" data-reveal>
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
