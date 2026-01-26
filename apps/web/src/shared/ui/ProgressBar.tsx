/* Progress bar component that shows a green bar, {value}% filled in */

export function ProgressBar({ value }: { value: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <>
      <style>{`
        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: var(--border);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar__fill {
          height: 100%;
          width: var(--progress, 0%);
          background-color: var(--accent-strong);
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .progress-bar__label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--ink-strong);
        }
      `}</style>
      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ "--progress": `${clampedValue}%` } as React.CSSProperties}
        />
      </div>
    </>
  );
}
