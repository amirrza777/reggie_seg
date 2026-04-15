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
import { resolveProjectMarkValue, resolveProjectWorkflowState } from "@/features/projects/lib/projectWorkflowState";
import { resolveStudentTeamFormationMode } from "@/features/projects/lib/teamFormationMode";
import type {
  ProjectDeadline,
  ProjectMarkingSummary,
} from "@/features/projects/types";

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
  } catch (error) {
    redirectOnUnauthorized(error);
    team = null;
  }

  const defaultDeadline: ProjectDeadline = {
    taskOpenDate: null,
    taskDueDate: null,
    assessmentOpenDate: null,
    assessmentDueDate: null,
    feedbackOpenDate: null,
    feedbackDueDate: null,
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
    teamAllocationInviteDueDate: null,
    isOverridden: false,
  };
  const [project, deadline] = await Promise.all([
    getProject(projectId).catch((error) => {
      redirectOnUnauthorized(error);
      throw error;
    }),
    getProjectDeadline(user.id, numericProjectId)
      .then((value) => value ?? defaultDeadline)
      .catch((error) => {
        redirectOnUnauthorized(error);
        return defaultDeadline;
      }),
  ]);

  const marking = await getProjectMarking(user.id, numericProjectId).catch((error) => {
    redirectOnUnauthorized(error);
    return null as ProjectMarkingSummary | null;
  });
  const workflowState = resolveProjectWorkflowState({
    project,
    deadline,
    markValue: resolveProjectMarkValue(marking),
  });
  const teamFormationMode =
    workflowState === "completed_unmarked" || workflowState === "completed_marked"
      ? "staff"
      : resolveStudentTeamFormationMode(project);

  return (
    <ProjectOverviewDashboard
      project={project}
      deadline={deadline}
      team={team}
      marking={marking}
      view="overview"
      teamFormationMode={teamFormationMode}
    />
  );
}
