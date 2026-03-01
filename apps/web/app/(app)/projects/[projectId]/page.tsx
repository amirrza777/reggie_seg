import { getProject, getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { ProjectOverviewDashboard } from "@/features/projects/components/ProjectOverviewDashboard";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);

  const [project, deadline, team] = await Promise.all([
    getProject(projectId),
    getProjectDeadline(4, numericProjectId),
    getTeamByUserAndProject(4, numericProjectId),
  ]);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      <ProjectOverviewDashboard project={project} deadline={deadline} team={team} />
    </div>
  );
}
