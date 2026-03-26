import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import type { StaffModuleProjectCardProject } from "@/features/staff/projects/components/StaffModuleProjectCard";
import { ApiError } from "@/shared/api/errors";

export type ProjectTeamLink = {
  id: number;
  teamName: string;
  memberCount: number;
  hasRepo: boolean;
  trelloBoardId: string | null;
};

export type StaffProjectWithTeams = Awaited<ReturnType<typeof getStaffProjects>>[number] & {
  teams: ProjectTeamLink[];
  teamFetchFailed: boolean;
};

export type ModuleGroup = {
  moduleId: number;
  moduleName: string;
  projects: StaffModuleProjectCardProject[];
};

export function mapProjectsToModuleCards(projects: StaffProjectWithTeams[]): StaffModuleProjectCardProject[] {
  return [...projects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => ({
      id: project.id,
      name: project.name,
      teamCount: project.teamCount,
      hasGithubRepo: project.hasGithubRepo,
      membersTotal: project.membersTotal,
      membersConnected: project.membersConnected,
      visibleTeams: project.teams,
      teamFetchFailed: project.teamFetchFailed,
    }));
}

export function toStaffLoadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function buildModuleGroups(projects: StaffProjectWithTeams[]): ModuleGroup[] {
  const moduleMap = new Map<number, ModuleGroup>();
  for (const project of projects) {
    const existing = moduleMap.get(project.moduleId);
    if (existing) {
      existing.projects.push({ ...project, visibleTeams: project.teams });
      continue;
    }

    moduleMap.set(project.moduleId, {
      moduleId: project.moduleId,
      moduleName: project.moduleName,
      projects: [{ ...project, visibleTeams: project.teams }],
    });
  }

  return Array.from(moduleMap.values())
    .map((group) => ({
      ...group,
      projects: [...group.projects].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

/** Loads staff projects with team rows, optionally filtered to one module and search query. */
export async function loadStaffProjectsWithTeamsForPage(
  userId: number,
  options: { moduleId?: number; query?: string },
): Promise<{ projects: StaffProjectWithTeams[]; errorMessage: string | null }> {
  let projects: StaffProjectWithTeams[] = [];
  let errorMessage: string | null = null;
  const rawQuery = options.query;

  try {
    const baseProjects = await getStaffProjects(userId, { query: rawQuery });
    const scoped =
      options.moduleId != null ? baseProjects.filter((p) => p.moduleId === options.moduleId) : baseProjects;

    projects = await Promise.all(
      scoped.map(async (project) => {
        try {
          const projectTeams = await getStaffProjectTeams(userId, project.id);
          return {
            ...project,
            teams: projectTeams.teams
              .map((team) => ({
                id: team.id,
                teamName: team.teamName,
                memberCount: team.allocations.length,
                hasRepo: project.hasGithubRepo,
                trelloBoardId: team.trelloBoardId ?? null,
              }))
              .sort((a, b) => a.teamName.localeCompare(b.teamName)),
            teamFetchFailed: false,
          };
        } catch {
          return {
            ...project,
            teams: [],
            teamFetchFailed: true,
          };
        }
      }),
    );
  } catch (error) {
    errorMessage = toStaffLoadErrorMessage(error, "Failed to load staff projects.");
  }

  return { projects, errorMessage };
}
