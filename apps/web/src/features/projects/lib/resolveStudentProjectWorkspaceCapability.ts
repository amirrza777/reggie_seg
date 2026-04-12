import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { resolveProjectMarkValue, resolveProjectWorkflowState } from "@/features/projects/lib/projectWorkflowState";

export type StudentProjectWorkspaceCapability = {
  /** User belongs to an active team for this project. */
  hasTeam: boolean;
  /** Parent module or project is archived. */
  workspaceArchived: boolean;
  /** Student can perform team-level edits (in team and workspace not archived). */
  canEdit: boolean;
};


export async function resolveStudentProjectWorkspaceCapability(
  userId: number | null | undefined,
  projectId: number,
): Promise<StudentProjectWorkspaceCapability> {
  const empty: StudentProjectWorkspaceCapability = {
    hasTeam: false,
    workspaceArchived: false,
    canEdit: false,
  };

  if (!userId || Number.isNaN(projectId)) {
    return empty;
  }

  const [team, project] = await Promise.all([
    getTeamByUserAndProject(userId, projectId).catch(() => null),
    getProject(String(projectId)).catch(() => null),
  ]);
  const hasTeam = Boolean(team);
  const workspaceArchived = Boolean(project?.moduleArchivedAt || project?.archivedAt);
  const [deadline, marking] = await Promise.all([
    getProjectDeadline(userId, projectId).catch(() => null),
    getProjectMarking(userId, projectId).catch(() => null),
  ]);
  const state = resolveProjectWorkflowState({
    project,
    deadline,
    markValue: resolveProjectMarkValue(marking),
  });
  const workspaceCompleted = state === "completed_unmarked" || state === "completed_marked";

  return {
    hasTeam,
    workspaceArchived,
    canEdit: hasTeam && !workspaceArchived && !workspaceCompleted,
  };
}
