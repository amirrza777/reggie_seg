import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const flagMap = await getFeatureFlagMap();
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <Placeholder
        title="Project team"
        path={`/projects/${projectId}/team`}
        description="Manage team members and roles."
      />
    </div>
  );
}