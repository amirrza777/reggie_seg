import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const teamId = Number(projectId);
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingsPageContent teamId={teamId} />
    </div>
  );
}
