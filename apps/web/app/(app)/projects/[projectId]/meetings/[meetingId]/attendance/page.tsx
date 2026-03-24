import { MeetingAttendanceContent } from "@/features/meetings/components/MeetingAttendanceContent";

type MeetingAttendancePageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingAttendancePage({ params }: MeetingAttendancePageProps) {
  const { projectId, meetingId } = await params;

  return <MeetingAttendanceContent meetingId={Number(meetingId)} projectId={Number(projectId)} />;
}
