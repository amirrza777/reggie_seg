import Link from "next/link";

type PlaceholderProps = {
  title: string;
  description?: string;
  path?: string;
  actionLabel?: string;
};

export function Placeholder({
  title,
  description,
  path,
  actionLabel = "Go to page",
}: PlaceholderProps) {
  return (
    <div className="placeholder">
      <div className="stack">
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
        {path && (
          <Link href={path} className="btn btn--ghost">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
