import type { ReactNode } from "react";

type TopbarProps = {
  title?: string;
  actions?: ReactNode;
};

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <div className="topbar">
      {title ? <h1 className="topbar__title">{title}</h1> : null}
      {actions ? <div className="topbar__actions">{actions}</div> : null}
    </div>
  );
}
