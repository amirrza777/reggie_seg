import type { ReactNode } from "react";

type CardProps = {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function Card({ title, action, children, className, bodyClassName }: CardProps) {
  const rootClass = ["card", action ? "card--has-action" : null, className].filter(Boolean).join(" ");
  const contentClass = ["card__body", bodyClassName].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      {(title || action) && (
        <div className="card__header">
          {title ? <h3 className="card__title">{title}</h3> : <span />}
          {action ? <div className="card__action">{action}</div> : null}
        </div>
      )}
      <div className={contentClass}>{children}</div>
    </div>
  );
}
