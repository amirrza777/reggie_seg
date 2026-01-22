import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { formatDate } from "@/shared/lib/formatDate";
import type { Meeting } from "../types";

const demoMeetings: Meeting[] = [
  { id: "mtg-1", title: "Kickoff", date: new Date().toISOString(), summary: "Project kickoff" },
  { id: "mtg-2", title: "Sprint review", date: new Date().toISOString(), summary: "Review outcomes" },
];

type MeetingListProps = {
  meetings?: Meeting[];
};

export function MeetingList({ meetings = demoMeetings }: MeetingListProps) {
  const rows = meetings.map((meeting) => [
    meeting.id,
    meeting.title,
    formatDate(meeting.date),
    meeting.summary ?? "",
  ]);
  return (
    <Card title="Meetings">
      <Table headers={["ID", "Title", "Date", "Summary"]} rows={rows} />
    </Card>
  );
}
