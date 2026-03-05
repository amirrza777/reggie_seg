"use client";

import { useState } from "react";

export type GithubChartInfoContent = {
  overview: string;
  interpretation: string;
  staffUse: string;
};

type GithubChartTitleWithInfoProps = {
  title: string;
  info: GithubChartInfoContent;
};

export function GithubChartTitleWithInfo({ title, info }: GithubChartTitleWithInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="github-chart-title">
        <button
          type="button"
          className="github-chart-title__info-btn"
          onClick={() => setOpen(true)}
          aria-label={`More information about ${title}`}
          title="More information"
        >
          i
        </button>
        <p className="github-chart-title__text">{title}</p>
      </div>

      {open ? (
        <div className="github-chart-info__overlay" role="dialog" aria-modal="true" aria-label={`${title} guidance`} onClick={() => setOpen(false)}>
          <div className="github-chart-info__modal" onClick={(event) => event.stopPropagation()}>
            <div className="github-chart-info__header">
              <h3 className="github-chart-info__title">{title}</h3>
              <button type="button" className="github-chart-info__close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="github-chart-info__body">
              <section className="github-chart-info__block">
                <p className="github-chart-info__label">What this shows</p>
                <p className="github-chart-info__text">{info.overview}</p>
              </section>
              <section className="github-chart-info__block">
                <p className="github-chart-info__label">How to interpret it</p>
                <p className="github-chart-info__text">{info.interpretation}</p>
              </section>
              <section className="github-chart-info__block">
                <p className="github-chart-info__label">How this may be used</p>
                <p className="github-chart-info__text">{info.staffUse}</p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
