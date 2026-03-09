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
  return (
    <div className="placeholder">
      <div className="stack">
        <h2 className={titleClassName}>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
    </div>
  );
}
