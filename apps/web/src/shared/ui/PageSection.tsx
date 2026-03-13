import type { ReactNode } from "react";

type PageSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  narrow?: boolean;
};

export function PageSection({ title, description, children, className, narrow = false }: PageSectionProps) {
  const rootClass = ["ui-page", narrow ? "ui-page--narrow" : null, className].filter(Boolean).join(" ");

  return (
    <section className={rootClass}>
      <header className="ui-page__header">
        <h2 className="ui-page__title">{title}</h2>
        {description ? <p className="ui-page__description">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
