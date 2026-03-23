import { MeetingEditContent } from "@/features/meetings/components/MeetingEditContent";

type MeetingEditPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingEditPage({ params }: MeetingEditPageProps) {
  const { projectId, meetingId } = await params;

  return <MeetingEditContent meetingId={Number(meetingId)} projectId={Number(projectId)} />;
}
