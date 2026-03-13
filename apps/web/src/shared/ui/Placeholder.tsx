import type { ReactNode } from "react";

type PlaceholderProps = {
  title: ReactNode;
  description?: string;
  titleClassName?: string;
};

export function Placeholder({
  title,
  description,
  titleClassName,
}: PlaceholderProps) {
  const resolvedTitleClass = ["overview-title", "ui-page__title", titleClassName].filter(Boolean).join(" ");

  return (
    <header className="ui-page__header">
      <h1 className={resolvedTitleClass}>{title}</h1>
      {description && <p className="ui-page__description">{description}</p>}
    </header>
  );
}
