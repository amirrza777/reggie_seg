import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectTeamPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <Placeholder
      title="Project team"
      path={`/projects/${projectId}/team`}
      description="Manage team members and roles."
    />
  );
}
