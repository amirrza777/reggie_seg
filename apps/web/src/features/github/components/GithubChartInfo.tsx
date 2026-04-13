"use client";

import { useState } from "react";
import { ModalPortal } from "@/shared/ui/modal/ModalPortal";

export type GithubChartInfoContent = {
  overview: string;
  interpretation: string;
  staffUse: string;
};

type GithubChartTitleWithInfoProps = {
  title: string;
  info: GithubChartInfoContent;
};

function GithubChartInfoTrigger({ title, onOpen }: { title: string; onOpen: () => void }) {
  return (
    <div className="github-chart-title">
      <button type="button" className="github-chart-title__info-btn" onClick={onOpen} aria-label={`More information about ${title}`} title="More information">i</button>
      <p className="github-chart-title__text">{title}</p>
    </div>
  );
}

function GithubChartInfoModalSections({ info }: { info: GithubChartInfoContent }) {
  return (
    <div className="github-chart-info__body">
      <section className="github-chart-info__block"><p className="github-chart-info__label">What this shows</p><p className="github-chart-info__text">{info.overview}</p></section>
      <section className="github-chart-info__block"><p className="github-chart-info__label">How to interpret it</p><p className="github-chart-info__text">{info.interpretation}</p></section>
      <section className="github-chart-info__block"><p className="github-chart-info__label">How this may be used</p><p className="github-chart-info__text">{info.staffUse}</p></section>
    </div>
  );
}

function GithubChartInfoModal({ title, info, onClose }: { title: string; info: GithubChartInfoContent; onClose: () => void }) {
  return (
    <ModalPortal>
      <div className="github-chart-info__overlay" role="dialog" aria-modal="true" aria-label={`${title} guidance`} onClick={onClose}>
        <div className="github-chart-info__modal" onClick={(event) => event.stopPropagation()}>
          <div className="github-chart-info__header"><h3 className="github-chart-info__title">{title}</h3><button type="button" className="github-chart-info__close" aria-label="Close" onClick={onClose}>×</button></div>
          <GithubChartInfoModalSections info={info} />
        </div>
      </div>
    </ModalPortal>
  );
}

export function GithubChartTitleWithInfo({ title, info }: GithubChartTitleWithInfoProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GithubChartInfoTrigger title={title} onOpen={() => setOpen(true)} />
      {open ? <GithubChartInfoModal title={title} info={info} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
