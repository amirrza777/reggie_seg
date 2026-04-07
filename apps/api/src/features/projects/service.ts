import { matchesFuzzySearch, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import {
  getProjectById,
  getUserProjects,
  getModulesForUser,
  getModuleStaffListForUser,
  getModuleStudentProjectMatrixForUser,
  createProject as createProjectInDb,
  getTeammatesInProject,
  getUserProjectDeadline,
  getTeamById,
  getTeamByUserAndProject,
  getQuestionsForProject,
  getTeamAllocationQuestionnaireForProject,
  getTeamAllocationQuestionnaireSubmissionContext,
  hasTeamAllocationQuestionnaireResponse,
  hasActiveTeamForUserInProject,
  upsertTeamAllocationQuestionnaireResponse,
  getStaffProjects,
  getStaffProjectTeams,
  getStaffViewerModuleAccessLabel,
  getStaffProjectsForMarking,
  getStaffStudentDeadlineOverrides,
  getUserProjectMarking,
  createTeamHealthMessage,
  getTeamHealthMessagesForUserInProject,
  getTeamHealthMessagesForTeamInProject,
  canStaffAccessTeamInProject,
  updateStaffTeamDeadlineProfile as updateStaffTeamDeadlineProfileInDb,
  upsertStaffStudentDeadlineOverride as upsertStaffStudentDeadlineOverrideInDb,
  clearStaffStudentDeadlineOverride as clearStaffStudentDeadlineOverrideInDb,
  getModuleLeadsForProject,
  type ProjectDeadlineInput,
  type StudentDeadlineOverrideInput,
} from "./repo.js";
import { prisma } from "../../shared/db.js";
import { addNotification } from "../notifications/service.js";
import { normalizeProjectNavFlagsConfig } from "./nav-flags/service.js";
import { joinModuleByCode as joinModuleByCodeInModuleJoin } from "../moduleJoin/service.js";
import { normalizeAndValidateAssessmentAnswers } from "../peerAssessment/answers.js";

export {
  createTeamWarningForStaff,
  fetchTeamWarningsForStaff,
  resolveTeamWarningForStaff,
  fetchMyTeamWarnings,
  fetchProjectWarningsConfigForStaff,
  updateProjectWarningsConfigForStaff,
  evaluateProjectWarningsForStaff,
  evaluateProjectWarningsForProject,
  parseProjectWarningsConfig,
  getDefaultProjectWarningsConfig,
} from "./warnings/service.js";

export type {
  WarningRuleSeverity,
  ProjectWarningRuleConfig,
  ProjectWarningsConfig,
  ProjectWarningsEvaluationSummary,
} from "./warnings/service.js";
export {
  fetchProjectNavFlagsConfigForStaff,
  updateProjectNavFlagsConfigForStaff,
  parseProjectNavFlagsConfig,
  getDefaultProjectNavFlagsConfig,
} from "./nav-flags/service.js";

export type {
  ProjectNavFlagKey,
  ProjectNavFlagsState,
  ProjectNavPeerMode,
  ProjectNavPeerModes,
  ProjectNavFlagsConfig,
} from "./nav-flags/service.js";

/** Creates a project. */
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  teamAllocationQuestionnaireTemplateId: number | undefined,
  informationText: string | null,
  deadline: ProjectDeadlineInput,
  studentIds?: number[],
) {
  return createProjectInDb(
    actorUserId,
    name,
    moduleId,
    questionnaireTemplateId,
    teamAllocationQuestionnaireTemplateId,
    informationText,
    deadline,
    studentIds,
  );
}

/** Returns the project by ID. */
export async function fetchProjectById(projectId: number) {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const moduleArchivedAt = project.module?.archivedAt ?? null;

  return {
    id: project.id,
    name: project.name,
    informationText: project.informationText,
    archivedAt: project.archivedAt,
    moduleId: project.moduleId,
    questionnaireTemplateId: project.questionnaireTemplateId,
    moduleArchivedAt,
    projectNavFlags: normalizeProjectNavFlagsConfig(project.projectNavFlags),
  };
}

/** Returns the projects for user. */
export async function fetchProjectsForUser(userId: number) {
  const projects = await getUserProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
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
  const shouldApplyStudentProjectScope = options?.staffOnly !== true && options?.compact !== true;
  const moduleProjectCounts = shouldApplyStudentProjectScope
    ? new Map<number, number>(
        (
          await getUserProjects(userId)
        ).reduce((accumulator, project) => {
          const moduleId = Number((project as { moduleId?: unknown }).moduleId);
          if (!Number.isInteger(moduleId) || moduleId <= 0) return accumulator;
          const current = accumulator.get(moduleId) ?? 0;
          accumulator.set(moduleId, current + 1);
          return accumulator;
        }, new Map<number, number>()),
      )
    : null;

  const staffFullList = options?.staffOnly === true && options?.compact !== true;
  return modules.map((module) => {
    const rawCount =
      "staffWithAccessCount" in module && typeof module.staffWithAccessCount === "number"
        ? module.staffWithAccessCount
        : undefined;
    const staffWithAccessCount = staffFullList ? (rawCount ?? 0) : rawCount;

    const projectWindowStart =
      "projectWindowStart" in module
        ? module.projectWindowStart === null
          ? null
          : module.projectWindowStart instanceof Date
            ? module.projectWindowStart.toISOString()
            : undefined
        : undefined;
    const projectWindowEnd =
      "projectWindowEnd" in module
        ? module.projectWindowEnd === null
          ? null
          : module.projectWindowEnd instanceof Date
            ? module.projectWindowEnd.toISOString()
            : undefined
        : undefined;

    const archivedAt =
      "archivedAt" in module
        ? module.archivedAt === null
          ? null
          : module.archivedAt instanceof Date
            ? module.archivedAt.toISOString()
            : null
        : undefined;

    const moduleIdNumeric = Number(module.id);
    const userProjectCountForModule =
      moduleProjectCounts && Number.isInteger(moduleIdNumeric) ? moduleProjectCounts.get(moduleIdNumeric) ?? 0 : null;
    const projectCount =
      module.accessRole === "ENROLLED" && userProjectCountForModule !== null
        ? userProjectCountForModule
        : ("projectCount" in module ? module.projectCount : 0);

    return {
      id: String(module.id),
      code: "code" in module ? module.code ?? undefined : undefined,
      title: module.name,
      briefText: "briefText" in module ? module.briefText ?? undefined : undefined,
      timelineText: "timelineText" in module ? module.timelineText ?? undefined : undefined,
      expectationsText: "expectationsText" in module ? module.expectationsText ?? undefined : undefined,
      readinessNotesText: "readinessNotesText" in module ? module.readinessNotesText ?? undefined : undefined,
      moduleLeadNames: "moduleLeadNames" in module ? module.moduleLeadNames : [],
      leaderCount: "leaderCount" in module ? module.leaderCount : undefined,
      teachingAssistantCount: "teachingAssistantCount" in module ? module.teachingAssistantCount : undefined,
      ...(projectWindowStart !== undefined ? { projectWindowStart } : {}),
      ...(projectWindowEnd !== undefined ? { projectWindowEnd } : {}),
      teamCount: "teamCount" in module ? module.teamCount : 0,
      projectCount,
      accountRole: module.accessRole,
      ...(typeof staffWithAccessCount === "number" ? { staffWithAccessCount } : {}),
      ...(archivedAt !== undefined ? { archivedAt } : {}),
    };
  });
}

/** Module leads + TAs for staff-accessible module detail pages. */
export async function fetchModuleStaffList(userId: number, moduleId: number) {
  return getModuleStaffListForUser(userId, moduleId);
}

/** Enrolled students and their team per project (staff module matrix). */
export async function fetchModuleStudentProjectMatrix(userId: number, moduleId: number) {
  return getModuleStudentProjectMatrixForUser(userId, moduleId);
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

/** Returns the team-allocation questionnaire for project. */
export async function fetchTeamAllocationQuestionnaireForProject(projectId: number) {
  return getTeamAllocationQuestionnaireForProject(projectId);
}

/** Returns team-allocation questionnaire status for the authenticated student in this project. */
export async function fetchTeamAllocationQuestionnaireStatusForUser(userId: number, projectId: number) {
  const context = await getTeamAllocationQuestionnaireSubmissionContext(userId, projectId);
  if (!context) {
    return null;
  }

  const hasSubmitted = await hasTeamAllocationQuestionnaireResponse({
    projectId: context.projectId,
    templateId: context.template.id,
    userId,
  });
  const now = Date.now();
  const opensAtMs = context.teamAllocationQuestionnaireOpenDate?.getTime() ?? null;
  const closesAtMs = context.teamAllocationQuestionnaireDueDate?.getTime() ?? null;
  const windowIsOpen =
    (opensAtMs === null || now >= opensAtMs) &&
    (closesAtMs === null || now <= closesAtMs);

  return {
    questionnaireTemplate: {
      id: context.template.id,
      purpose: context.template.purpose,
      questions: context.template.questions,
    },
    hasSubmitted,
    teamAllocationQuestionnaireOpenDate:
      context.teamAllocationQuestionnaireOpenDate?.toISOString() ?? null,
    teamAllocationQuestionnaireDueDate:
      context.teamAllocationQuestionnaireDueDate?.toISOString() ?? null,
    windowIsOpen,
  };
}

/** Saves a student's response to the project team-allocation questionnaire. */
export async function submitTeamAllocationQuestionnaireResponse(
  userId: number,
  projectId: number,
  answersJson: unknown,
) {
  const context = await getTeamAllocationQuestionnaireSubmissionContext(userId, projectId);
  if (!context) {
    throw { code: "PROJECT_OR_TEMPLATE_NOT_FOUND_OR_FORBIDDEN" };
  }

  if (context.template.purpose !== "CUSTOMISED_ALLOCATION") {
    throw { code: "TEMPLATE_INVALID_PURPOSE" };
  }

  const now = Date.now();
  const opensAtMs = context.teamAllocationQuestionnaireOpenDate?.getTime() ?? null;
  const closesAtMs = context.teamAllocationQuestionnaireDueDate?.getTime() ?? null;
  if (opensAtMs !== null && now < opensAtMs) {
    throw { code: "QUESTIONNAIRE_WINDOW_NOT_OPEN" };
  }
  if (closesAtMs !== null && now > closesAtMs) {
    throw { code: "QUESTIONNAIRE_WINDOW_CLOSED" };
  }

  const hasUnsupportedTextQuestions = context.template.questions.some((question) => {
    const normalized = String(question.type ?? "").trim().toLowerCase();
    return !(normalized === "multiple-choice" || normalized === "multiple_choice" || normalized === "rating" || normalized === "slider");
  });
  if (hasUnsupportedTextQuestions) {
    throw { code: "TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES" };
  }

  const userAlreadyAssigned = await hasActiveTeamForUserInProject(userId, projectId);
  if (userAlreadyAssigned) {
    throw { code: "USER_ALREADY_IN_TEAM" };
  }

  const normalizedAnswers = normalizeAndValidateAssessmentAnswers(answersJson, context.template.questions);
  const saved = await upsertTeamAllocationQuestionnaireResponse({
    projectId: context.projectId,
    enterpriseId: context.enterpriseId,
    templateId: context.template.id,
    reviewerUserId: userId,
    answersJson: normalizedAnswers,
  });

  return {
    id: saved.id,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

/** Returns all projects with teams for the staff marking overview. */
export async function fetchProjectsWithTeamsForStaffMarking(userId: number, options?: { query?: string | null }) {
  const projects = await getStaffProjectsForMarking(userId, options);
  const query = typeof options?.query === "string" ? options.query.trim() : "";
  const numericQuery = query ? parsePositiveIntegerSearchQuery(query) : null;

  return projects.flatMap((project) => {
    const projectOrModuleMatches =
      !query ||
      (numericQuery !== null && project.id === numericQuery) ||
      matchesFuzzySearch(query, [project.name, project.module?.name ?? ""]);

    const matchingTeams = projectOrModuleMatches
      ? project.teams
      : project.teams.filter((team) => matchesFuzzySearch(query, [team.teamName]));

    if (matchingTeams.length === 0) return [];

    return [{
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      teams: matchingTeams.map((team) => ({
        id: team.id,
        teamName: team.teamName,
        projectId: team.projectId,
        inactivityFlag: team.inactivityFlag as "NONE" | "YELLOW" | "RED",
        studentCount: team._count.allocations,
      })),
    }];
  });
}

type StaffProjectListTeam = {
  trelloBoardId: string | null;
  allocations: { user: { githubAccount: { id: number } | null } }[];
  _count: { peerAssessments: number };
};

function deadlineRangeBounds(deadline: Record<string, unknown> | null | undefined): { start: Date | null; end: Date | null } {
  if (!deadline || typeof deadline !== "object") return { start: null, end: null };
  const instants: number[] = [];
  for (const v of Object.values(deadline)) {
    if (v instanceof Date) instants.push(v.getTime());
  }
  if (instants.length === 0) return { start: null, end: null };
  const min = Math.min(...instants);
  const max = Math.max(...instants);
  return { start: new Date(min), end: new Date(max) };
}

function trelloTeamsLinkedStats(teams: { trelloBoardId: string | null }[]) {
  const total = teams.length;
  if (total === 0) return { percent: 0, linked: 0, total: 0 };
  const linked = teams.filter((t) => t.trelloBoardId && String(t.trelloBoardId).trim()).length;
  return { percent: Math.round((linked / total) * 100), linked, total };
}

function peerAssessmentCompletionStats(teams: StaffProjectListTeam[]) {
  let submitted = 0;
  let expected = 0;
  for (const team of teams) {
    const n = team.allocations.length;
    if (n < 2) continue;
    expected += n * (n - 1);
    submitted += team._count.peerAssessments;
  }
  const percent = expected === 0 ? 0 : Math.min(100, Math.round((submitted / expected) * 100));
  return { percent, submitted, expected };
}

function githubMembersLinkedPercent(membersTotal: number, membersConnected: number) {
  if (membersTotal === 0) return 0;
  return Math.round((membersConnected / membersTotal) * 100);
}

/** Returns the projects for staff. */
export async function fetchProjectsForStaff(userId: number, options?: { query?: string | null; moduleId?: number }) {
  const projects = await getStaffProjects(userId, options);
  const now = Date.now();
  return projects.map((project) => {
    const allAllocations = project.teams.flatMap((t) => t.allocations);
    const hasProjectStudents = project._count.projectStudents > 0;
    const membersTotal = hasProjectStudents ? project._count.projectStudents : allAllocations.length;
    const membersConnected = allAllocations.filter((a) => a.user.githubAccount).length;
    const { start, end } = deadlineRangeBounds(project.deadline as Record<string, unknown> | null | undefined);
    const trelloStats = trelloTeamsLinkedStats(project.teams);
    const peerStats = peerAssessmentCompletionStats(project.teams as StaffProjectListTeam[]);
    return {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      archivedAt: project.archivedAt ? new Date(project.archivedAt).toISOString() : null,
      teamCount: project.teams.length,
      hasGithubRepo: project._count.githubRepositories > 0,
      daysOld: Math.floor((now - new Date(project.createdAt).getTime()) / 86_400_000),
      membersTotal,
      membersConnected,
      dateRangeStart: start?.toISOString() ?? null,
      dateRangeEnd: end?.toISOString() ?? null,
      githubIntegrationPercent: githubMembersLinkedPercent(membersTotal, membersConnected),
      trelloBoardsLinkedPercent: trelloStats.percent,
      trelloBoardsLinkedCount: trelloStats.linked,
      peerAssessmentsSubmittedPercent: peerStats.percent,
      peerAssessmentsSubmittedCount: peerStats.submitted,
      peerAssessmentsExpectedCount: peerStats.expected,
    };
  });
}

/** Returns the project teams for staff. */
export async function fetchProjectTeamsForStaff(userId: number, projectId: number) {
  const project = await getStaffProjectTeams(userId, projectId);
  if (!project) return null;

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const viewerAccessLabel = await getStaffViewerModuleAccessLabel(userId, actor?.role ?? "STAFF", project.moduleId);

  const role = actor?.role ?? "STAFF";
  let canManageProjectSettings = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  if (!canManageProjectSettings && role === "STAFF") {
    const lead = await prisma.moduleLead.findUnique({
      where: { moduleId_userId: { moduleId: project.moduleId, userId } },
      select: { userId: true },
    });
    canManageProjectSettings = Boolean(lead);
  }

  const moduleArchivedAt = project.module?.archivedAt ?? null;
  const projectArchivedAt = project.archivedAt ? new Date(project.archivedAt).toISOString() : null;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      moduleArchivedAt,
      projectArchivedAt,
      viewerAccessLabel,
      canManageProjectSettings,
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
      trelloBoardId: team.trelloBoardId ?? null,
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

  const message = await createTeamHealthMessage(projectId, team.id, userId, subject, details);
  const leads = await getModuleLeadsForProject(projectId);
  await Promise.all(
    leads.map((lead) =>
      addNotification({
        userId: lead.userId,
        type: "TEAM_HEALTH_SUBMITTED",
        message: "A team health message has been submitted",
        link: `/staff/projects/${projectId}/teams/${team.id}/teamhealth`,
      })
    )
  );
  return message;
}

export async function fetchMyTeamHealthMessages(userId: number, projectId: number) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  return getTeamHealthMessagesForTeamInProject(projectId, team.id);
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
  const override = await upsertStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId, payload);
  await addNotification({
    userId: studentId,
    type: "DEADLINE_OVERRIDE_GRANTED",
    message: "Your deadline has been updated by a staff member",
    link: `/projects/${projectId}/deadlines`,
  });
  return override;
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  return clearStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId);
}
