export const ShowcaseSection = () => (
  <section className="section section--padded" id="showcase">
    <div className="container stack">
      <div
        className="showcase__frame"
        data-reveal
        data-reveal-offset="30%"
        data-reveal-threshold="0.05"
      >
        <div className="showcase__glow" aria-hidden="true" />
        <div className="showcase__content">
          <p className="eyebrow">Platform preview</p>
          <p className="muted">Placeholder hero image — swap in your dashboard and mobile screens.</p>
        </div>
      </div>
    </div>
  </section>
);
