import type { MeetingStats } from "../types";

type MeetingStatsPanelProps = {
  stats: MeetingStats;
};

export function MeetingStatsPanel({ stats }: MeetingStatsPanelProps) {
  return (
    <div className="meeting-stats">
      <div className="meeting-stats__card">
        <span className="meeting-stats__value">{stats.totalMeetings}</span>
        <span className="meeting-stats__label">Total meetings</span>
      </div>
      <div className="meeting-stats__card">
        <span className="meeting-stats__value">{Math.round(stats.avgAttendanceRate * 100)}%</span>
        <span className="meeting-stats__label">Avg attendance</span>
      </div>
      <div className="meeting-stats__card">
        <span className="meeting-stats__value">{Math.round(stats.onTimeRate * 100)}%</span>
        <span className="meeting-stats__label">On-time rate</span>
      </div>
    </div>
  );
}
