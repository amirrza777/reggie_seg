import { MeetingDetailContent } from "@/features/meetings/components/detail/MeetingDetailContent";

type MeetingPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { projectId, meetingId } = await params;

  return <MeetingDetailContent meetingId={Number(meetingId)} projectId={Number(projectId)} />;
}
