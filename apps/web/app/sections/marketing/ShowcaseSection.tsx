import { MarketingPicture } from "./MarketingPicture";

export const ShowcaseSection = () => (
  <section className="section section--padded" id="showcase">
    <div className="container stack">
      <div className="showcase__frame" data-reveal>
        <div className="showcase__media">
          <MarketingPicture
            index={2}
            alt="Team Feedback platform preview across desktop and mobile"
            pictureClassName="showcase__picture"
            imageClassName="showcase__image"
            loading="eager"
          />
        </div>
        <span className="ui-visually-hidden">Platform preview</span>
        <div className="showcase__glow" aria-hidden="true" />
      </div>
    </div>
  </section>
);
