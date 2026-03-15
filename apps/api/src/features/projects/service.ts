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
  getStaffStudentDeadlineOverrides,
  getUserProjectMarking,
  updateStaffTeamDeadlineProfile as updateStaffTeamDeadlineProfileInDb,
  upsertStaffStudentDeadlineOverride as upsertStaffStudentDeadlineOverrideInDb,
  clearStaffStudentDeadlineOverride as clearStaffStudentDeadlineOverrideInDb,
  type ProjectDeadlineInput,
  type StudentDeadlineOverrideInput,
} from "./repo.js";

export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  deadline: ProjectDeadlineInput,
) {
  return createProjectInDb(actorUserId, name, moduleId, questionnaireTemplateId, deadline);
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
    archivedAt: project.archivedAt ?? null,
  }));
}

export async function fetchModulesForUser(userId: number, options?: { staffOnly?: boolean; compact?: boolean }) {
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
  const now = Date.now();
  return projects.map((project) => {
    const allAllocations = project.teams.flatMap((t) => t.allocations);
    const membersTotal = allAllocations.length;
    const membersConnected = allAllocations.filter((a) => a.user.githubAccount).length;
    return {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      teamCount: project._count.teams,
      hasGithubRepo: project._count.githubRepositories > 0,
      daysOld: Math.floor((now - new Date(project.createdAt).getTime()) / 86_400_000),
      membersTotal,
      membersConnected,
    };
  });
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
    teams: project.teams.map((team) => ({
      id: team.id,
      teamName: team.teamName,
      projectId: team.projectId,
      createdAt: team.createdAt,
      inactivityFlag: team.inactivityFlag,
      deadlineProfile: team.deadlineProfile,
      hasDeadlineOverride: Boolean(team.deadlineOverride),
      allocations: team.allocations,
    })),
  };
}

export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}

export async function updateTeamDeadlineProfileForStaff(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  return updateStaffTeamDeadlineProfileInDb(actorUserId, teamId, deadlineProfile);
}

export async function fetchStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  return getStaffStudentDeadlineOverrides(actorUserId, projectId);
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  return upsertStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId, payload);
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  return clearStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId);
}
