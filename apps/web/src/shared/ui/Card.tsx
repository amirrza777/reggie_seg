import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Card({ title, action, children }: CardProps) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card__header">
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {action ? action : null}
        </div>
      )}
      <div className="card__body">{children}</div>
    </div>
  );
}
