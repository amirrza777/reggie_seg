type PlaceholderProps = {
  title: string;
  description?: string;
};

export function Placeholder({
  title,
  description
}: PlaceholderProps) {
  return (
    <div className="placeholder">
      <div className="stack">
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
    </div>
  );
}
