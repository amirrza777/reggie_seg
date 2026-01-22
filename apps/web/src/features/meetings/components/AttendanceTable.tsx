import { Table } from "@/shared/ui/Table";
import type { Attendee } from "../types";

const demoAttendees: Attendee[] = [
  { id: "person-1", name: "Avery", present: true },
  { id: "person-2", name: "Jordan", present: false },
];

type AttendanceTableProps = {
  attendees?: Attendee[];
};

export function AttendanceTable({ attendees = demoAttendees }: AttendanceTableProps) {
  const rows = attendees.map((attendee) => [attendee.name, attendee.present ? "Present" : "Absent"]);
  return <Table headers={["Name", "Attendance"]} rows={rows} />;
}
