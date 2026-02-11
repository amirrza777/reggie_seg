export function ProgressBar({ value }: { value: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${clampedValue}%` }} />
      </div>
    </div>
  );
}
