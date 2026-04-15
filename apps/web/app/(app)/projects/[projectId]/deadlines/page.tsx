import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { ProjectOverviewDashboard } from "@/features/projects/components/ProjectOverviewDashboard";
import Link from "next/link";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
import type { ProjectDeadline } from "@/features/projects/types";
import type { ProjectMarkingSummary } from "@/features/projects/types";

type DeadlinesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function DeadlinesPage({ params }: DeadlinesPageProps) {
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
  } catch (error) {
    redirectOnUnauthorized(error);
    team = null;
  }

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <p>You are not in a team for this project.</p>
      </div>
    );
  }

  const project = await getProject(projectId).catch((error) => {
    redirectOnUnauthorized(error);
    throw error;
  });

  let deadline: ProjectDeadline = {
    taskOpenDate: null,
    taskDueDate: null,
    assessmentOpenDate: null,
    assessmentDueDate: null,
    feedbackOpenDate: null,
    feedbackDueDate: null,
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
    isOverridden: false,
  };
  try {
    deadline = await getProjectDeadline(user.id, numericProjectId);
  } catch (error) {
    redirectOnUnauthorized(error);
    // Keep default empty deadline object if API is unavailable.
  }

  let marking: ProjectMarkingSummary | null = null;
  try {
    marking = await getProjectMarking(user.id, numericProjectId);
  } catch (error) {
    redirectOnUnauthorized(error);
    marking = null;
  }

  return <ProjectOverviewDashboard project={project} deadline={deadline} team={team} marking={marking} view="deadlines" />;
}
