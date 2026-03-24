import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { ProjectOverviewDashboard } from "@/features/projects/components/ProjectOverviewDashboard";
import Link from "next/link";
import type { ProjectDeadline } from "@/features/projects/types";
import type { ProjectMarkingSummary } from "@/features/projects/types";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p>Please sign in to view this project.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  try {
    team = await getTeamByUserAndProject(user.id, numericProjectId);
  } catch {
    team = null;
  }

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <p>You are not in a team for this project.</p>
      </div>
    );
  }

  const defaultDeadline: ProjectDeadline = {
    taskOpenDate: null,
    taskDueDate: null,
    assessmentOpenDate: null,
    assessmentDueDate: null,
    feedbackOpenDate: null,
    feedbackDueDate: null,
    isOverridden: false,
  };
  const [project, deadline] = await Promise.all([
    getProject(projectId),
    getProjectDeadline(user.id, numericProjectId).catch(() => defaultDeadline),
  ]);

  const dueCandidates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
  const latestDue = dueCandidates.length > 0
    ? dueCandidates.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest))
    : null;
  const now = new Date();
  const likelyCompleted = Boolean(project.archivedAt) || Boolean(latestDue && latestDue.getTime() < now.getTime());

  let marking: ProjectMarkingSummary | null = null;
  if (likelyCompleted) {
    marking = await getProjectMarking(user.id, numericProjectId).catch(() => null as ProjectMarkingSummary | null);
  }

  return <ProjectOverviewDashboard project={project} deadline={deadline} team={team} marking={marking} view="overview" />;
}
