import { getProject, getProjectDeadline , getTeamByUserAndProject} from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getCurrentUser } from "@/shared/auth/session";
import { formatDateTime } from "@/shared/lib/dateFormatter";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  
  const flagMap = await getFeatureFlagMap();
  
  const project = await getProject(projectId);
  const user = await getCurrentUser();

  let deadline: Awaited<ReturnType<typeof getProjectDeadline>> | null = null;
  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;

  if (user) {
    try {
      deadline = await getProjectDeadline(user.id, Number(projectId));
      team = await getTeamByUserAndProject(user.id, Number(projectId));
    } catch {
      // user not in a team or no deadline
    }
  }

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <div style={{ padding: "20px" }}>
        <h1>{project?.name || "Project"}</h1>
        {!user ? (
          <p style={{ color: "#666", marginTop: "8px" }}>
            Please sign in to view your team and deadlines.
          </p>
        ) : !deadline || !team ? (
          <p style={{ color: "#666", marginTop: "8px" }}>
            You are not in a team for this project, or project deadlines are not set.
          </p>
        ) : (
          <p style={{ color: "#666", marginTop: "8px" }}>
            Team Name : {team.teamName}
            <br />
            Project deadline: {formatDateTime(deadline.taskDueDate)}
            <br />
            Assessment opening: {formatDateTime(deadline.assessmentOpenDate)}
            <br />
            Assessment deadline: {formatDateTime(deadline.assessmentDueDate)}
            <br />
            Feedback opening: {formatDateTime(deadline.feedbackOpenDate)}
            <br />
            Feedback deadline: {formatDateTime(deadline.feedbackDueDate)}
          </p>
        )}
      </div>
    </div>
  );
}