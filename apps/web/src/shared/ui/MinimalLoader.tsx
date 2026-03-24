type MinimalLoaderProps = {
  label?: string;
  className?: string;
};

function joinClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function MinimalLoader({ label = "Loading", className }: MinimalLoaderProps) {
  return (
    <div className={joinClassNames("ui-minimal-loader", className)} role="status" aria-live="polite" aria-label={label}>
      <span className="ui-minimal-loader__dots" aria-hidden="true">
        <span className="ui-minimal-loader__dot" />
        <span className="ui-minimal-loader__dot" />
        <span className="ui-minimal-loader__dot" />
      </span>
      <span className="ui-minimal-loader__label">{label}</span>
    </div>
  );
}
