import {
  getProjectById,
  getUserProjects,
  getModulesForUser,
  createProject as createProjectInDb,
  getTeammatesInProject,
  getUserProjectDeadline,
  getTeamById,
  getTeamByUserAndProject,
  getQuestionsForProject,
  getStaffProjects,
  getStaffProjectTeams,
  getUserProjectMarking,
} from "./repo.js";

/** Creates a project. */
export async function createProject(name: string, moduleId: number, questionnaireTemplateId: number, teamIds: number[]) {
  return createProjectInDb(name, moduleId, questionnaireTemplateId, teamIds);
}

/** Returns the project by ID. */
export async function fetchProjectById(projectId: number) {
  return getProjectById(projectId);
}

/** Returns the projects for user. */
export async function fetchProjectsForUser(userId: number) {
  const projects = await getUserProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    moduleName: project.module?.name ?? "",
    archivedAt: project.archivedAt ?? null,
  }));
}

/** Returns the modules for user. */
export async function fetchModulesForUser(userId: number, options?: { staffOnly?: boolean }) {
  const modules = await getModulesForUser(userId, options);
  return modules.map((module) => ({
    id: String(module.id),
    title: module.name,
    briefText: module.briefText ?? undefined,
    timelineText: module.timelineText ?? undefined,
    expectationsText: module.expectationsText ?? undefined,
    readinessNotesText: module.readinessNotesText ?? undefined,
    teamCount: module.teamCount,
    projectCount: module.projectCount,
    accountRole: module.accessRole,
  }));
}

/** Returns the teammates for project. */
export async function fetchTeammatesForProject(userId: number, projectId: number) {
  return getTeammatesInProject(userId, projectId);
}

/** Returns the project deadline. */
export async function fetchProjectDeadline(userId: number, projectId: number) {
  return getUserProjectDeadline(userId, projectId);
}

/** Returns the team by ID. */
export async function fetchTeamById(teamId: number) {
  return getTeamById(teamId);
}

/** Returns the team by user and project. */
export async function fetchTeamByUserAndProject(userId: number, projectId: number) {
  return getTeamByUserAndProject(userId, projectId);
}

/** Returns the questions for project. */
export async function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

/** Returns the projects for staff. */
export async function fetchProjectsForStaff(userId: number) {
  const projects = await getStaffProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module?.name ?? "",
    teamCount: project._count.teams,
  }));
}

/** Returns the project teams for staff. */
export async function fetchProjectTeamsForStaff(userId: number, projectId: number) {
  const project = await getStaffProjectTeams(userId, projectId);
  if (!project) return null;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
    },
    teams: project.teams,
  };
}

/** Returns the project marking. */
export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}
