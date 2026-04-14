import { matchesFuzzySearch, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import {
  getProjectById,
  getUserProjects,
  getModulesForUser,
  getModuleStaffListForUser,
  getModuleStudentProjectMatrixForUser,
  createProject as createProjectInDb,
  getTeammatesInProject,
  getTeamById,
  getTeamByUserAndProject,
  getQuestionsForProject,
  getTeamAllocationQuestionnaireForProject,
  getTeamAllocationQuestionnaireSubmissionContext,
  hasTeamAllocationQuestionnaireResponse,
  hasActiveTeamForUserInProject,
  upsertTeamAllocationQuestionnaireResponse,
  getStaffProjectsForMarking,
  type ProjectDeadlineInput,
} from "./repo.js";
import { normalizeProjectNavFlagsConfig } from "./nav-flags/service.js";
import { normalizeAndValidateAssessmentAnswers } from "../peerAssessment/answers.js";

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
  const moduleName = project.module?.name ?? "";

  return {
    id: project.id,
    name: project.name,
    moduleName,
    informationText: project.informationText,
    archivedAt: project.archivedAt,
    moduleId: project.moduleId,
    questionnaireTemplateId: project.questionnaireTemplateId,
    teamAllocationQuestionnaireTemplateId: project.teamAllocationQuestionnaireTemplateId,
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
    taskOpenDate: project.deadline?.taskOpenDate?.toISOString() ?? null,
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
  const windowIsOpen = (opensAtMs === null || now >= opensAtMs) && (closesAtMs === null || now <= closesAtMs);

  return {
    questionnaireTemplate: {
      id: context.template.id,
      purpose: context.template.purpose,
      questions: context.template.questions,
    },
    hasSubmitted,
    teamAllocationQuestionnaireOpenDate: context.teamAllocationQuestionnaireOpenDate?.toISOString() ?? null,
    teamAllocationQuestionnaireDueDate: context.teamAllocationQuestionnaireDueDate?.toISOString() ?? null,
    windowIsOpen,
  };
}

function validateQuestionnaireTemplate(template: any) {
  if (template.purpose !== "CUSTOMISED_ALLOCATION") {
    throw { code: "TEMPLATE_INVALID_PURPOSE" };
  }
}

function validateQuestionnaireWindow(openDate: Date | null, closeDate: Date | null) {
  const now = Date.now();
  const opensAtMs = openDate?.getTime() ?? null;
  const closesAtMs = closeDate?.getTime() ?? null;
  if (opensAtMs !== null && now < opensAtMs) {
    throw { code: "QUESTIONNAIRE_WINDOW_NOT_OPEN" };
  }
  if (closesAtMs !== null && now > closesAtMs) {
    throw { code: "QUESTIONNAIRE_WINDOW_CLOSED" };
  }
}

function validateQuestionTypes(questions: any[]) {
  const unsupported = questions.some((q) => {
    const normalized = String(q.type ?? "").trim().toLowerCase();
    return !(normalized === "multiple-choice" || normalized === "multiple_choice" || normalized === "rating" || normalized === "slider");
  });
  if (unsupported) {
    throw { code: "TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES" };
  }
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

  validateQuestionnaireTemplate(context.template);
  validateQuestionnaireWindow(context.teamAllocationQuestionnaireOpenDate, context.teamAllocationQuestionnaireDueDate);
  validateQuestionTypes(context.template.questions);

  if (await hasActiveTeamForUserInProject(userId, projectId)) {
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

  return { id: saved.id, updatedAt: saved.updatedAt.toISOString() };
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

    const allTeams = project.teams;
    const markedTeamCount = allTeams.filter(
      (team) => team.staffTeamMarking?.mark != null && Number.isFinite(team.staffTeamMarking.mark),
    ).length;
    const totalTeamCount = allTeams.length;

    return [
      {
        id: project.id,
        name: project.name,
        moduleId: project.moduleId,
        moduleName: project.module?.name ?? "",
        markingProgress: {
          markedTeamCount,
          totalTeamCount,
        },
        teams: matchingTeams.map((team) => ({
          id: team.id,
          teamName: team.teamName,
          projectId: team.projectId,
          inactivityFlag: team.inactivityFlag as "NONE" | "YELLOW" | "RED",
          studentCount: team._count.allocations,
          teamMark:
            team.staffTeamMarking?.mark != null && Number.isFinite(team.staffTeamMarking.mark)
              ? team.staffTeamMarking.mark
              : null,
        })),
      },
    ];
  });
}
