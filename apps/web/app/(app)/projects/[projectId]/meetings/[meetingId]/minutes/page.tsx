import { MeetingMinutesContent } from "@/features/meetings/components/MeetingMinutesContent";

type MeetingMinutesPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingMinutesPage({ params }: MeetingMinutesPageProps) {
  const { projectId, meetingId } = await params;

  return <MeetingMinutesContent meetingId={Number(meetingId)} projectId={Number(projectId)} />;
}
