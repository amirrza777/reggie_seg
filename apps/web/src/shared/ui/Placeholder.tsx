import type { ReactNode } from "react";

type PlaceholderProps = {
  title: string;
  description?: string;
  path?: string;
  hint?: ReactNode;
};

export function Placeholder({ title, description, path, hint }: PlaceholderProps) {
  return (
    <section className="placeholder">
      <p className="eyebrow">{path ?? "Placeholder"}</p>
      <h2>{title}</h2>
      {description ? <p className="lede">{description}</p> : null}
      {hint ? <div className="placeholder__hint">{hint}</div> : null}
    </section>
  );
}
