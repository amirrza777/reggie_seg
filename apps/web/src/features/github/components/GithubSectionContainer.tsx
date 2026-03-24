import type { ReactNode } from "react";

type GithubSectionContainerProps = {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function GithubSectionContainer({
  kicker,
  title,
  description,
  children,
}: GithubSectionContainerProps) {
  return (
    <section className="github-chart-section__block">
      <header className="github-chart-section__block-header">
        <p className="github-chart-section__block-kicker">{kicker}</p>
        <h3 className="github-chart-section__block-title">{title}</h3>
        {description ? <p className="muted github-chart-section__block-subtitle">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
