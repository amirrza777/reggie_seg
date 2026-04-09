import { getProject, getTeamByUserAndProject } from "@/features/projects/api/client";

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

  return {
    hasTeam,
    workspaceArchived,
    canEdit: hasTeam && !workspaceArchived,
  };
}
