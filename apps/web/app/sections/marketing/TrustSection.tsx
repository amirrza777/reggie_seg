import { LogoMarquee } from "./LogoMarquee";

export const TrustSection = () => (
  <section className="section section--padded trust" id="resources">
    <div className="container stack trust__wrap" data-reveal>
      <h2 className="trust__title">Trusted by teams, backed by moderators</h2>
    </div>
    <LogoMarquee />
  </section>
);
