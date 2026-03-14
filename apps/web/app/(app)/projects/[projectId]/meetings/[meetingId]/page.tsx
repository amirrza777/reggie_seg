import { MeetingDetailContent } from "@/features/meetings/components/MeetingDetailContent";

type MeetingPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { meetingId } = await params;
  return <MeetingDetailContent meetingId={Number(meetingId)} />;
}
