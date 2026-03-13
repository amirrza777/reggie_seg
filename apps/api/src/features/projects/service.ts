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
  createTeamHealthMessage,
  getTeamHealthMessagesForUserInProject,
  getTeamHealthMessagesForTeamInProject,
  canStaffAccessTeamInProject,
} from "./repo.js";

export async function createProject(name: string, moduleId: number, questionnaireTemplateId: number, teamIds: number[]) {
  return createProjectInDb(name, moduleId, questionnaireTemplateId, teamIds);
}

export async function fetchProjectById(projectId: number) {
  return getProjectById(projectId);
}

export async function fetchProjectsForUser(userId: number) {
  const projects = await getUserProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    moduleName: project.module?.name ?? "",
  }));
}

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

export async function fetchTeammatesForProject(userId: number, projectId: number) {
  return getTeammatesInProject(userId, projectId);
}

export async function fetchProjectDeadline(userId: number, projectId: number) {
  return getUserProjectDeadline(userId, projectId);
}

export async function fetchTeamById(teamId: number) {
  return getTeamById(teamId);
}

export async function fetchTeamByUserAndProject(userId: number, projectId: number) {
  return getTeamByUserAndProject(userId, projectId);
}

export async function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

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

export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}

export async function submitTeamHealthMessage(
  userId: number,
  projectId: number,
  subject: string,
  details: string
) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  return createTeamHealthMessage(projectId, team.id, userId, subject, details);
}

export async function fetchMyTeamHealthMessages(userId: number, projectId: number) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  return getTeamHealthMessagesForUserInProject(projectId, userId);
}

export async function fetchTeamHealthMessagesForStaff(userId: number, projectId: number, teamId: number) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return getTeamHealthMessagesForTeamInProject(projectId, teamId);
}
