import { MeetingEditContent } from "@/features/meetings/components/MeetingEditContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type MeetingEditPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingEditPage({ params }: MeetingEditPageProps) {
  const { projectId, meetingId } = await params;
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingEditContent meetingId={Number(meetingId)} projectId={Number(projectId)} />
    </div>
  );
}
