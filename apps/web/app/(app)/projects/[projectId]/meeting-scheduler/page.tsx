import { MeetingSchedulerContent } from "@/features/meetings/components/MeetingSchedulerContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MeetingSchedulerPage({ params }: PageProps) {
  const { projectId } = await params;
  const teamId = Number(projectId);
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingSchedulerContent teamId={teamId} projectId={teamId} />
    </div>
  );
}
