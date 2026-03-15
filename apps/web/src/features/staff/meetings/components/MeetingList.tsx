import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { isPresent } from "../attendance";
import type { StaffMeeting } from "../types";

type MeetingListProps = {
  meetings: StaffMeeting[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MeetingList({ meetings }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <Card title="Meetings">
        <p className="muted">No meetings recorded yet.</p>
      </Card>
    );
  }

  const rows = meetings.map((meeting) => {
    const present = meeting.attendances.filter((a) => isPresent(a.status)).length;
    const total = meeting.attendances.length;
    return [
      meeting.title,
      formatDate(meeting.date),
      `${meeting.organiser.firstName} ${meeting.organiser.lastName}`,
      total > 0 ? `${present} / ${total}` : <span className="muted">Not recorded</span>,
      meeting.minutes ? "Yes" : <span className="muted">No</span>,
    ];
  });

  return (
    <Card title="Meetings">
      <Table
        headers={["Title", "Date", "Organiser", "Attendance", "Minutes"]}
        rows={rows}
      />
    </Card>
  );
}
