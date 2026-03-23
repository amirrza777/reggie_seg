import {
  getProjectById,
  getUserProjects,
  getModulesForUser,
  getModuleJoinActor,
  joinModuleByCode as joinModuleByCodeInDb,
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
  createTeamHealthMessage,
  getTeamHealthMessagesForUserInProject,
  getTeamHealthMessagesForTeamInProject,
  canStaffAccessTeamInProject,
  updateStaffTeamDeadlineProfile as updateStaffTeamDeadlineProfileInDb,
  upsertStaffStudentDeadlineOverride as upsertStaffStudentDeadlineOverrideInDb,
  clearStaffStudentDeadlineOverride as clearStaffStudentDeadlineOverrideInDb,
  type ProjectDeadlineInput,
  type StudentDeadlineOverrideInput,
} from "./repo.js";
import { normalizeModuleJoinCode } from "../services/moduleJoinCodeService.js";

/** Creates a project. */
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  deadline: ProjectDeadlineInput,
) {
  return createProjectInDb(actorUserId, name, moduleId, questionnaireTemplateId, deadline);
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
export async function fetchModulesForUser(
  userId: number,
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null },
) {
  const modules = await getModulesForUser(userId, options);
  return modules.map((module) => ({
    id: String(module.id),
    code: "code" in module ? module.code ?? undefined : undefined,
    title: module.name,
    briefText: "briefText" in module ? module.briefText ?? undefined : undefined,
    timelineText: "timelineText" in module ? module.timelineText ?? undefined : undefined,
    expectationsText: "expectationsText" in module ? module.expectationsText ?? undefined : undefined,
    readinessNotesText: "readinessNotesText" in module ? module.readinessNotesText ?? undefined : undefined,
    teamCount: "teamCount" in module ? module.teamCount : 0,
    projectCount: "projectCount" in module ? module.projectCount : 0,
    accountRole: module.accessRole,
  }));
}

export async function joinModuleByCode(actorUserId: number, rawCode: string) {
  const actor = await getModuleJoinActor(actorUserId);
  if (!actor) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  if (actor.role !== "STUDENT") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  const normalizedCode = normalizeModuleJoinCode(rawCode);
  if (!normalizedCode) {
    return { ok: false as const, status: 400, error: "Invalid or unavailable module code" };
  }

  const enrolled = await joinModuleByCodeInDb({
    enterpriseId: actor.enterpriseId,
    userId: actor.id,
    joinCode: normalizedCode,
  });
  if (!enrolled) {
    return { ok: false as const, status: 400, error: "Invalid or unavailable module code" };
  }

  return {
    ok: true as const,
    value: {
      moduleId: enrolled.moduleId,
      moduleName: enrolled.moduleName,
      enrolled: true,
      alreadyEnrolled: enrolled.alreadyEnrolled,
    },
  };
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
export async function fetchProjectsForStaff(userId: number, options?: { query?: string | null }) {
  const projects = await getStaffProjects(userId, options);
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
      teamCount: project.teams.length,
      hasGithubRepo: project._count.githubRepositories > 0,
      daysOld: Math.floor((now - new Date(project.createdAt).getTime()) / 86_400_000),
      membersTotal,
      membersConnected,
    };
  });
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
    teams: project.teams.map((team) => ({
      id: team.id,
      teamName: team.teamName,
      projectId: team.projectId,
      allocationLifecycle: team.allocationLifecycle,
      createdAt: team.createdAt,
      inactivityFlag: team.inactivityFlag,
      deadlineProfile: team.deadlineProfile,
      hasDeadlineOverride: Boolean(team.deadlineOverride),
      allocations: team.allocations,
    })),
  };
}

/** Returns the project marking. */
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
