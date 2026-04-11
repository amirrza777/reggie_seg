import Link from "next/link";
import { MarketingPicture } from "./MarketingPicture";

export const AboutSection = () => (
  <section className="section section--muted" id="about">
    <div className="container split split--center" data-reveal-group>
      <div className="split__content split__content--stack" data-reveal>
        <p className="eyebrow">About</p>
        <h2>Your peer assessment, finally manageable</h2>
        <p className="lede">
          Collect meaningful feedback without messy spreadsheets. Students submit once, staff review quickly, and the
          system highlights outliers, conflicts, and missing submissions.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--ghost" href="/?section=product">
            How peer assessment works
          </Link>
        </div>
      </div>
      <div className="split__visual split__visual--soft" data-reveal>
        <div className="split__visual-media">
          <MarketingPicture
            index={3}
            alt="Peer assessment workflow screen"
            pictureClassName="split__visual-picture"
            imageClassName="split__visual-image"
          />
        </div>
      </div>
    </div>
  </section>
);
