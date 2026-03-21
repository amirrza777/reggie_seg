import { MeetingMinutesContent } from "@/features/meetings/components/MeetingMinutesContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type MeetingMinutesPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingMinutesPage({ params }: MeetingMinutesPageProps) {
  const { projectId, meetingId } = await params;
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingMinutesContent meetingId={Number(meetingId)} projectId={Number(projectId)} />
    </div>
  );
}
