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
  getUserProjectMarking,
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

export async function fetchModulesForUser(userId: number) {
  const modules = await getModulesForUser(userId);
  return modules.map((module) => ({
    id: String(module.id),
    title: module.name,
    teamCount: module.teamCount,
    projectCount: module.projectCount,
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

export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}
