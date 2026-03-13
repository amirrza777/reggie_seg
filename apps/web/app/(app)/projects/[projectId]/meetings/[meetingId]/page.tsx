import { MeetingDetailContent } from "@/features/meetings/components/MeetingDetailContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type MeetingPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { projectId, meetingId } = await params;
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingDetailContent meetingId={Number(meetingId)} />
    </div>
  );
}
