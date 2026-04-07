import { archiveCalendarTooltip } from "../lib/archiveMessages";

const svg = { width: 16, height: 16, viewBox: "0 0 24 24" as const, "aria-hidden": true as const };

export function ArchiveRowInfoHintIcon({ label }: { label: string }) {
  return (
    <button type="button" className="archive-status-hint archive-status-hint--info" title={label} aria-label={label}>
      <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 16V10" />
        <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

export function ArchiveStatusStack({
  variant,
  label,
  archivedAt,
}: {
  variant: "active" | "archived";
  label: string;
  archivedAt: string | null | undefined;
}) {
  const archived = variant === "archived";
  const tip = archiveCalendarTooltip(archivedAt, archived);
  return (
    <div className="archive-status-stack__row">
      <span className={`archive-badge ${archived ? "archive-badge--archived" : "archive-badge--active"}`}>{label}</span>
      <button type="button" className="archive-status-hint archive-status-hint--calendar" title={tip} aria-label={tip}>
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={1.75}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path strokeLinecap="round" d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      </button>
    </div>
  );
}
