import crypto from "crypto";
import type { TeamInviteStatus } from "@prisma/client";
import { sendEmail } from "../../shared/email.js";
import { addNotification } from "../notifications/service.js";
import { prisma } from "../../shared/db.js";
import { planCustomAllocationTeams } from "./customAllocator.js";
import { planRandomTeams } from "./randomizer.js";
import {
  approveDraftTeam,
  applyManualAllocationTeam,
  applyRandomAllocationPlan,
  createTeamInviteRecord,
  deleteDraftTeam,
  findDraftTeamById,
  findDraftTeamInProject,
  findCustomAllocationQuestionnairesForStaff,
  findCustomAllocationTemplateForStaff,
  findActiveInvite,
  findInviteContext,
  findLatestCustomAllocationResponsesForStudents,
  findModuleStudentsByIdsInModule,
  findPendingInvitesForEmail,
  findModuleStudentsForManualAllocation,
  findProjectDraftTeams,
  findVacantModuleStudentsForProject,
  findProjectTeamSummaries,
  findRespondingStudentIdsForTemplateInProject,
  findStaffScopedProjectAccess,
  findStaffScopedProject,
  findStudentAllocationConflictsInProject,
  findTeamNameConflictInEnterprise,
  getInvitesForTeam,
  TeamService,
  updateDraftTeam,
  updateInviteStatusFromPending,
} from "./repo.js";

type CreateTeamInviteParams = {
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  inviteeId?: number;
  message?: string;
  baseUrl: string;
  expiresInMs?: number;
};

type StudentTeamCreationScope = {
  enterpriseId: string;
  projectId: number;
};

export type RandomAllocationPreview = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  previewTeams: Array<{
    index: number;
    suggestedName: string;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>;
  unassignedStudents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type RandomAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
};

export type ManualAllocationWorkspace = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: "AVAILABLE" | "ALREADY_IN_TEAM";
    currentTeam: {
      id: number;
      teamName: string;
    } | null;
  }>;
  counts: {
    totalStudents: number;
    availableStudents: number;
    alreadyInTeamStudents: number;
  };
};

export type ManualAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  team: {
    id: number;
    teamName: string;
    memberCount: number;
  };
};

export type AllocationDraftsWorkspace = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  access: {
    actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
    isModuleLead: boolean;
    isModuleTeachingAssistant: boolean;
    canApproveAllocationDrafts: boolean;
  };
  drafts: Array<{
    id: number;
    teamName: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    draftCreatedBy: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>;
};

export type AllocationDraftUpdated = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  access: {
    actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
    isModuleLead: boolean;
    isModuleTeachingAssistant: boolean;
    canApproveAllocationDrafts: boolean;
  };
  draft: {
    id: number;
    teamName: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    draftCreatedBy: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  };
};

export type AllocationDraftApproved = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  approvedTeam: {
    id: number;
    teamName: string;
    memberCount: number;
  };
};

export type AllocationDraftDeleted = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  deletedDraft: {
    id: number;
    teamName: string;
  };
};

export type CustomAllocationQuestionType = "multiple-choice" | "rating" | "slider";
export type CustomAllocationCriteriaStrategy = "diversify" | "group" | "ignore";
export type CustomAllocationNonRespondentStrategy = "distribute_randomly" | "exclude";

export type CustomAllocationQuestionnaireListing = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaires: Array<{
    id: number;
    templateName: string;
    ownerId: number;
    isPublic: boolean;
    eligibleQuestionCount: number;
    eligibleQuestions: Array<{
      id: number;
      label: string;
      type: CustomAllocationQuestionType;
    }>;
  }>;
};

export type CustomAllocationCoverage = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaireTemplateId: number;
  totalAvailableStudents: number;
  respondingStudents: number;
  nonRespondingStudents: number;
  responseRate: number;
  responseThreshold: number;
};

export type CustomAllocationPreviewInput = {
  questionnaireTemplateId: number;
  teamCount: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
  criteria: Array<{
    questionId: number;
    strategy: CustomAllocationCriteriaStrategy;
    weight: number;
  }>;
};

export type CustomAllocationPreview = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaireTemplateId: number;
  previewId: string;
  generatedAt: string;
  expiresAt: string;
  teamCount: number;
  respondentCount: number;
  nonRespondentCount: number;
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
  criteriaSummary: Array<{
    questionId: number;
    strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriteriaSummary: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
  previewTeams: Array<{
    index: number;
    suggestedName: string;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      responseStatus: "RESPONDED" | "NO_RESPONSE";
    }>;
  }>;
  unassignedStudents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    responseStatus: "RESPONDED" | "NO_RESPONSE";
  }>;
};

export type CustomAllocationApplyInput = {
  previewId: string;
  teamNames?: string[];
};

export type CustomAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  previewId: string;
  studentCount: number;
  teamCount: number;
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
};

const DEFAULT_CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = 80;
const CUSTOM_ALLOCATION_PREVIEW_TTL_MS = 15 * 60 * 1000;

type StoredCustomPreviewTeam = {
  index: number;
  suggestedName: string;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    responseStatus: "RESPONDED" | "NO_RESPONSE";
  }>;
};

type StoredCustomAllocationPreview = {
  previewId: string;
  staffId: number;
  projectId: number;
  questionnaireTemplateId: number;
  generatedAt: Date;
  expiresAt: Date;
  teamCount: number;
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
  criteriaSummary: Array<{
    questionId: number;
    strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriteriaSummary: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
  previewTeams: StoredCustomPreviewTeam[];
};

const customAllocationPreviewCache = new Map<string, StoredCustomAllocationPreview>();
type CustomAllocationStaleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

function normalizeCustomAllocationQuestionType(rawType: string): CustomAllocationQuestionType | null {
  const normalized = rawType.trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "multiple-choice") {
    return "multiple-choice";
  }
  if (normalized === "rating") {
    return "rating";
  }
  if (normalized === "slider") {
    return "slider";
  }
  return null;
}

function cleanupExpiredCustomAllocationPreviews(referenceTime = Date.now()) {
  for (const [previewId, preview] of customAllocationPreviewCache.entries()) {
    if (preview.expiresAt.getTime() <= referenceTime) {
      customAllocationPreviewCache.delete(previewId);
    }
  }
}

function getCustomAllocationResponseThreshold() {
  const rawThreshold = process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD;
  const parsedThreshold = Number(rawThreshold);
  if (!Number.isFinite(parsedThreshold)) {
    return DEFAULT_CUSTOM_ALLOCATION_RESPONSE_THRESHOLD;
  }
  return Math.min(100, Math.max(0, Number(parsedThreshold.toFixed(2))));
}

type TeamSizeConstraints = {
  minTeamSize?: number;
  maxTeamSize?: number;
};

function normalizeTeamSizeConstraints(input: TeamSizeConstraints): TeamSizeConstraints {
  const { minTeamSize, maxTeamSize } = input;

  if (
    minTeamSize !== undefined &&
    (!Number.isInteger(minTeamSize) || minTeamSize < 1)
  ) {
    throw { code: "INVALID_MIN_TEAM_SIZE" };
  }

  if (
    maxTeamSize !== undefined &&
    (!Number.isInteger(maxTeamSize) || maxTeamSize < 1)
  ) {
    throw { code: "INVALID_MAX_TEAM_SIZE" };
  }

  if (
    minTeamSize !== undefined &&
    maxTeamSize !== undefined &&
    minTeamSize > maxTeamSize
  ) {
    throw { code: "INVALID_TEAM_SIZE_RANGE" };
  }

  return {
    ...(minTeamSize !== undefined ? { minTeamSize } : {}),
    ...(maxTeamSize !== undefined ? { maxTeamSize } : {}),
  };
}

function resolveConstrainedPlanningShape(
  studentCount: number,
  teamCount: number,
  constraints: TeamSizeConstraints,
) {
  const minimum = constraints.minTeamSize ?? 0;
  const maximum = constraints.maxTeamSize ?? studentCount;

  const maxTeamsByMinimum = minimum === 0 ? teamCount : Math.floor(studentCount / minimum);
  const activeTeamCount = Math.max(0, Math.min(teamCount, maxTeamsByMinimum));
  if (activeTeamCount === 0) {
    return { activeTeamCount: 0, assignableStudentCount: 0 };
  }

  const assignableStudentCount = Math.min(studentCount, activeTeamCount * maximum);
  return { activeTeamCount, assignableStudentCount };
}

function shuffleForPlanning<T>(students: T[], seed?: number): T[] {
  if (students.length <= 1) {
    return [...students];
  }
  const shuffledSingletonTeams = planRandomTeams(
    students,
    students.length,
    seed !== undefined ? { seed } : {},
  );
  return shuffledSingletonTeams.flatMap((team) => team.members);
}

function buildConstrainedRandomPlan<TStudent>(
  students: TStudent[],
  teamCount: number,
  constraints: TeamSizeConstraints,
  options: { seed?: number } = {},
) {
  const shape = resolveConstrainedPlanningShape(students.length, teamCount, constraints);
  const seed = typeof options.seed === "number" && Number.isFinite(options.seed) ? options.seed : undefined;
  const shuffledStudents = shuffleForPlanning(students, seed);
  const assignedStudents = shuffledStudents.slice(0, shape.assignableStudentCount);
  const unassignedStudents = shuffledStudents.slice(shape.assignableStudentCount);

  const activeTeams =
    shape.activeTeamCount > 0 && assignedStudents.length > 0
      ? planRandomTeams(assignedStudents, shape.activeTeamCount, {
          ...constraints,
          ...(seed !== undefined ? { seed: seed + 1 } : {}),
        })
      : [];

  const teams = Array.from({ length: teamCount }, (_unused, index) => {
    const activeTeam = activeTeams[index];
    return {
      index,
      members: activeTeam ? activeTeam.members : ([] as TStudent[]),
    };
  });

  return {
    teams,
    unassignedStudents,
  };
}

function buildConstrainedCustomPopulation<TRespondent, TNonRespondent>(
  respondents: TRespondent[],
  nonRespondents: TNonRespondent[],
  teamCount: number,
  constraints: TeamSizeConstraints,
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy,
) {
  const candidateCount =
    nonRespondentStrategy === "exclude"
      ? respondents.length
      : respondents.length + nonRespondents.length;
  const shape = resolveConstrainedPlanningShape(candidateCount, teamCount, constraints);

  const shuffledRespondents = shuffleForPlanning(respondents);
  const shuffledNonRespondents = shuffleForPlanning(nonRespondents);
  const assignableRespondentCount = Math.min(
    shuffledRespondents.length,
    shape.assignableStudentCount,
  );
  const remainingNonRespondentCapacity =
    nonRespondentStrategy === "distribute_randomly"
      ? Math.max(0, shape.assignableStudentCount - assignableRespondentCount)
      : 0;
  const assignableNonRespondentCount = Math.min(
    shuffledNonRespondents.length,
    remainingNonRespondentCapacity,
  );

  return {
    activeTeamCount: shape.activeTeamCount,
    assignableRespondents: shuffledRespondents.slice(0, assignableRespondentCount),
    unassignedRespondents: shuffledRespondents.slice(assignableRespondentCount),
    assignableNonRespondents: shuffledNonRespondents.slice(0, assignableNonRespondentCount),
    unassignedNonRespondents:
      nonRespondentStrategy === "exclude"
        ? shuffledNonRespondents
        : shuffledNonRespondents.slice(assignableNonRespondentCount),
  };
}

function storeCustomAllocationPreview(preview: StoredCustomAllocationPreview) {
  cleanupExpiredCustomAllocationPreviews(preview.generatedAt.getTime());
  customAllocationPreviewCache.set(preview.previewId, preview);
}

function getStoredCustomAllocationPreview(
  previewId: string,
  staffId: number,
  projectId: number,
): StoredCustomAllocationPreview | null {
  cleanupExpiredCustomAllocationPreviews();
  const preview = customAllocationPreviewCache.get(previewId);
  if (!preview) {
    return null;
  }
  if (preview.staffId !== staffId || preview.projectId !== projectId) {
    return null;
  }
  return preview;
}

function parseCustomAllocationAnswers(answersJson: unknown): Map<number, unknown> {
  const answersByQuestionId = new Map<number, unknown>();

  if (Array.isArray(answersJson)) {
    for (const answerItem of answersJson) {
      if (!answerItem || typeof answerItem !== "object") {
        continue;
      }

      const row = answerItem as Record<string, unknown>;
      const rawQuestionId = row.questionId ?? row.question;
      const questionId = Number(rawQuestionId);
      if (!Number.isInteger(questionId) || questionId < 1) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(row, "answer")) {
        continue;
      }

      answersByQuestionId.set(questionId, row.answer);
    }
    return answersByQuestionId;
  }

  if (!answersJson || typeof answersJson !== "object") {
    return answersByQuestionId;
  }

  for (const [rawQuestionId, answer] of Object.entries(answersJson as Record<string, unknown>)) {
    const questionId = Number(rawQuestionId);
    if (!Number.isInteger(questionId) || questionId < 1) {
      continue;
    }
    answersByQuestionId.set(questionId, answer);
  }

  return answersByQuestionId;
}

function resolveCustomAllocationTeamNames(
  previewTeams: Array<{ suggestedName: string }>,
  teamNames?: string[],
): string[] {
  const defaults = previewTeams.map((team, index) => {
    const fallbackName = `Custom Team ${index + 1}`;
    const normalized = team.suggestedName.trim();
    return normalized.length > 0 ? normalized : fallbackName;
  });

  if (teamNames === undefined) {
    return defaults;
  }

  if (!Array.isArray(teamNames) || teamNames.length !== previewTeams.length) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const normalizedNames = teamNames.map((teamName) => teamName.trim());
  if (normalizedNames.some((teamName) => teamName.length === 0)) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const uniqueNames = new Set(normalizedNames.map((teamName) => teamName.toLowerCase()));
  if (uniqueNames.size !== normalizedNames.length) {
    throw { code: "DUPLICATE_TEAM_NAMES" };
  }

  return normalizedNames;
}

function findStaleStudentsFromPreview(
  previewTeams: StoredCustomPreviewTeam[],
  currentlyVacantStudentIds: Set<number>,
): CustomAllocationStaleStudent[] {
  const staleById = new Map<number, CustomAllocationStaleStudent>();
  for (const team of previewTeams) {
    for (const member of team.members) {
      if (currentlyVacantStudentIds.has(member.id)) {
        continue;
      }
      if (staleById.has(member.id)) {
        continue;
      }
      staleById.set(member.id, {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
      });
    }
  }
  return Array.from(staleById.values());
}

function mapAllocationDraftTeamForResponse(team: {
  id: number;
  teamName: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}) {
  return {
    id: team.id,
    teamName: team.teamName,
    memberCount: team.memberCount,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    draftCreatedBy: team.draftCreatedBy,
    members: team.members,
  };
}

function normalizeManualAllocationSearchQuery(searchQuery: string | null | undefined) {
  if (typeof searchQuery !== "string") {
    return null;
  }

  const trimmed = searchQuery.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 120) {
    throw { code: "INVALID_SEARCH_QUERY" };
  }
  return trimmed;
}

export async function listCustomAllocationQuestionnairesForProject(
  staffId: number,
  projectId: number,
): Promise<CustomAllocationQuestionnaireListing> {
  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const templates = await findCustomAllocationQuestionnairesForStaff(staffId);
  const questionnaires = templates
    .map((template) => {
      const eligibleQuestions = template.questions
        .map((question) => {
          const normalizedType = normalizeCustomAllocationQuestionType(question.type);
          if (!normalizedType) {
            return null;
          }
          return {
            id: question.id,
            label: question.label,
            type: normalizedType,
          };
        })
        .filter((question): question is NonNullable<typeof question> => question !== null);

      if (eligibleQuestions.length === 0) {
        return null;
      }

      return {
        id: template.id,
        templateName: template.templateName,
        ownerId: template.ownerId,
        isPublic: template.isPublic,
        eligibleQuestionCount: eligibleQuestions.length,
        eligibleQuestions,
      };
    })
    .filter((template): template is NonNullable<typeof template> => template !== null);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    questionnaires,
  };
}

export async function getCustomAllocationCoverageForProject(
  staffId: number,
  projectId: number,
  questionnaireTemplateId: number,
): Promise<CustomAllocationCoverage> {
  if (!Number.isInteger(questionnaireTemplateId) || questionnaireTemplateId < 1) {
    throw { code: "INVALID_TEMPLATE_ID" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const template = await findCustomAllocationTemplateForStaff(staffId, questionnaireTemplateId);
  if (!template) {
    throw { code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN" };
  }

  const availableStudents = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    project.id,
  );
  const availableStudentIds = availableStudents.map((student) => student.id);
  const respondingStudentIds =
    availableStudentIds.length === 0
      ? []
      : await findRespondingStudentIdsForTemplateInProject(
          project.id,
          template.id,
          availableStudentIds,
        );

  const totalAvailableStudents = availableStudents.length;
  const respondingStudents = new Set(respondingStudentIds).size;
  const nonRespondingStudents = Math.max(0, totalAvailableStudents - respondingStudents);
  const responseRate =
    totalAvailableStudents === 0
      ? 0
      : Number(((respondingStudents / totalAvailableStudents) * 100).toFixed(2));

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    questionnaireTemplateId: template.id,
    totalAvailableStudents,
    respondingStudents,
    nonRespondingStudents,
    responseRate,
    responseThreshold: getCustomAllocationResponseThreshold(),
  };
}

export async function previewCustomAllocationForProject(
  staffId: number,
  projectId: number,
  input: CustomAllocationPreviewInput,
): Promise<CustomAllocationPreview> {
  if (!Number.isInteger(input.teamCount) || input.teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }
  if (!Number.isInteger(input.questionnaireTemplateId) || input.questionnaireTemplateId < 1) {
    throw { code: "INVALID_TEMPLATE_ID" };
  }
  if (
    input.nonRespondentStrategy !== "distribute_randomly" &&
    input.nonRespondentStrategy !== "exclude"
  ) {
    throw { code: "INVALID_NON_RESPONDENT_STRATEGY" };
  }

  if (
    !Array.isArray(input.criteria) ||
    input.criteria.some(
      (criterion) =>
        !Number.isInteger(criterion.questionId) ||
        criterion.questionId < 1 ||
        (criterion.strategy !== "diversify" &&
          criterion.strategy !== "group" &&
          criterion.strategy !== "ignore") ||
        !Number.isInteger(criterion.weight) ||
        criterion.weight < 1 ||
        criterion.weight > 5,
    )
  ) {
    throw { code: "INVALID_CRITERIA" };
  }
  const teamSizeConstraints = normalizeTeamSizeConstraints({
    ...(input.minTeamSize !== undefined ? { minTeamSize: input.minTeamSize } : {}),
    ...(input.maxTeamSize !== undefined ? { maxTeamSize: input.maxTeamSize } : {}),
  });

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const template = await findCustomAllocationTemplateForStaff(staffId, input.questionnaireTemplateId);
  if (!template) {
    throw { code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN" };
  }

  const eligibleQuestions = template.questions
    .map((question) => {
      const type = normalizeCustomAllocationQuestionType(question.type);
      if (!type) {
        return null;
      }
      return {
        id: question.id,
        label: question.label,
        type,
      };
    })
    .filter((question): question is NonNullable<typeof question> => question !== null);
  const eligibleQuestionIds = new Set(eligibleQuestions.map((question) => question.id));
  const hasInvalidCriterionQuestion = input.criteria.some(
    (criterion) => !eligibleQuestionIds.has(criterion.questionId),
  );
  if (hasInvalidCriterionQuestion) {
    throw { code: "INVALID_CRITERIA" };
  }

  const uniqueCriteriaQuestionIds = new Set(input.criteria.map((criterion) => criterion.questionId));
  if (uniqueCriteriaQuestionIds.size !== input.criteria.length) {
    throw { code: "INVALID_CRITERIA" };
  }

  const students = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    project.id,
  );
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (input.teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }

  const studentIds = students.map((student) => student.id);
  const responseRecords = await findLatestCustomAllocationResponsesForStudents(
    project.id,
    template.id,
    studentIds,
  );
  const responsesByReviewerId = new Map<number, Map<number, unknown>>();
  for (const record of responseRecords) {
    responsesByReviewerId.set(record.reviewerUserId, parseCustomAllocationAnswers(record.answersJson));
  }

  const respondents = students
    .filter((student) => responsesByReviewerId.has(student.id))
    .map((student) => {
      const answersByQuestionId = responsesByReviewerId.get(student.id) ?? new Map<number, unknown>();
      const responses: Record<number, unknown> = {};
      for (const [questionId, answer] of answersByQuestionId.entries()) {
        responses[questionId] = answer;
      }
      return {
        ...student,
        responses,
      };
    });
  const nonRespondents = students.filter((student) => !responsesByReviewerId.has(student.id));

  const criteriaForAllocator = input.criteria
    .filter((criterion) => criterion.strategy !== "ignore")
    .map((criterion) => ({
      questionId: criterion.questionId,
      strategy: criterion.strategy,
      weight: criterion.weight,
    })) as Array<{ questionId: number; strategy: "diversify" | "group"; weight: number }>;

  const constrainedPopulation = buildConstrainedCustomPopulation(
    respondents,
    nonRespondents,
    input.teamCount,
    teamSizeConstraints,
    input.nonRespondentStrategy,
  );
  const plannedStudentCount =
    constrainedPopulation.assignableRespondents.length +
    constrainedPopulation.assignableNonRespondents.length;

  const allocationPlan =
    constrainedPopulation.activeTeamCount > 0 && plannedStudentCount > 0
      ? planCustomAllocationTeams({
          respondents: constrainedPopulation.assignableRespondents,
          nonRespondents: constrainedPopulation.assignableNonRespondents,
          criteria: criteriaForAllocator,
          teamCount: constrainedPopulation.activeTeamCount,
          nonRespondentStrategy: input.nonRespondentStrategy,
          ...(teamSizeConstraints.minTeamSize !== undefined
            ? { minTeamSize: teamSizeConstraints.minTeamSize }
            : {}),
          ...(teamSizeConstraints.maxTeamSize !== undefined
            ? { maxTeamSize: teamSizeConstraints.maxTeamSize }
            : {}),
        })
      : {
          teams: [] as Array<{
            index: number;
            members: Array<{
              id: number;
              firstName: string;
              lastName: string;
              email: string;
              responseStatus: "RESPONDED" | "NO_RESPONSE";
            }>;
          }>,
          unassignedNonRespondents: [] as Array<{
            id: number;
            firstName: string;
            lastName: string;
            email: string;
          }>,
          criterionScores: [] as Array<{
            questionId: number;
            strategy: "diversify" | "group";
            weight: number;
            satisfactionScore: number;
          }>,
          teamCriterionBreakdowns: [] as Array<{
            teamIndex: number;
            criteria: Array<{
              questionId: number;
              strategy: "diversify" | "group";
              weight: number;
              responseCount: number;
              summary:
                | { kind: "none" }
                | { kind: "numeric"; average: number; min: number; max: number }
                | { kind: "categorical"; categories: Array<{ value: string; count: number }> };
            }>;
          }>,
          overallScore: 0,
        };

  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + CUSTOM_ALLOCATION_PREVIEW_TTL_MS);
  const previewId = `custom-preview-${crypto.randomUUID()}`;
  const basePreviewTeams = allocationPlan.teams.map((team, index) => ({
    index: team.index,
    suggestedName: `Custom Team ${index + 1}`,
    members: team.members.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      responseStatus: member.responseStatus,
    })),
  }));
  const previewTeamByIndex = new Map(basePreviewTeams.map((team) => [team.index, team] as const));
  const previewTeams = Array.from({ length: input.teamCount }, (_unused, index) => ({
    index,
    suggestedName: `Custom Team ${index + 1}`,
    members: previewTeamByIndex.get(index)?.members ?? [],
  }));

  const hasAssignedRespondents = constrainedPopulation.assignableRespondents.length > 0;
  const criteriaSummary = hasAssignedRespondents
    ? allocationPlan.criterionScores.map((criterionScore) => ({
        questionId: criterionScore.questionId,
        strategy: criterionScore.strategy,
        weight: criterionScore.weight,
        satisfactionScore: criterionScore.satisfactionScore,
      }))
    : criteriaForAllocator.map((criterion) => ({
        questionId: criterion.questionId,
        strategy: criterion.strategy,
        weight: criterion.weight,
        satisfactionScore: 0,
      }));
  const baseTeamCriteriaSummary = hasAssignedRespondents
    ? allocationPlan.teamCriterionBreakdowns.map((team) => ({
        teamIndex: team.teamIndex,
        criteria: team.criteria.map((criterion) => ({
          questionId: criterion.questionId,
          strategy: criterion.strategy,
          weight: criterion.weight,
          responseCount: criterion.responseCount,
          summary: criterion.summary,
        })),
      }))
    : Array.from({ length: constrainedPopulation.activeTeamCount }, (_unused, teamIndex) => ({
        teamIndex,
        criteria: criteriaForAllocator.map((criterion) => ({
          questionId: criterion.questionId,
          strategy: criterion.strategy,
          weight: criterion.weight,
          responseCount: 0,
          summary: { kind: "none" as const },
        })),
      }));
  const teamCriteriaSummaryByIndex = new Map(
    baseTeamCriteriaSummary.map((team) => [team.teamIndex, team] as const),
  );
  const teamCriteriaSummary = Array.from({ length: input.teamCount }, (_unused, teamIndex) => ({
    teamIndex,
    criteria:
      teamCriteriaSummaryByIndex.get(teamIndex)?.criteria ??
      criteriaForAllocator.map((criterion) => ({
        questionId: criterion.questionId,
        strategy: criterion.strategy,
        weight: criterion.weight,
        responseCount: 0,
        summary: { kind: "none" as const },
      })),
  }));

  const unassignedStudentsById = new Map<
    number,
    {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      responseStatus: "RESPONDED" | "NO_RESPONSE";
    }
  >();
  for (const student of constrainedPopulation.unassignedRespondents) {
    unassignedStudentsById.set(student.id, {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      responseStatus: "RESPONDED",
    });
  }
  for (const student of constrainedPopulation.unassignedNonRespondents) {
    unassignedStudentsById.set(student.id, {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      responseStatus: "NO_RESPONSE",
    });
  }
  for (const student of allocationPlan.unassignedNonRespondents) {
    if (unassignedStudentsById.has(student.id)) {
      continue;
    }
    unassignedStudentsById.set(student.id, {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      responseStatus: "NO_RESPONSE",
    });
  }
  const unassignedStudents = Array.from(unassignedStudentsById.values());

  const overallScore = hasAssignedRespondents ? allocationPlan.overallScore : 0;
  const storedPreview: StoredCustomAllocationPreview = {
    previewId,
    staffId,
    projectId: project.id,
    questionnaireTemplateId: template.id,
    generatedAt,
    expiresAt,
    teamCount: input.teamCount,
    nonRespondentStrategy: input.nonRespondentStrategy,
    criteriaSummary,
    teamCriteriaSummary,
    overallScore,
    previewTeams,
  };
  storeCustomAllocationPreview(storedPreview);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    questionnaireTemplateId: template.id,
    previewId,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    teamCount: input.teamCount,
    respondentCount: respondents.length,
    nonRespondentCount: nonRespondents.length,
    nonRespondentStrategy: input.nonRespondentStrategy,
    criteriaSummary,
    teamCriteriaSummary,
    overallScore,
    previewTeams,
    unassignedStudents,
  };
}

export async function applyCustomAllocationForProject(
  staffId: number,
  projectId: number,
  input: CustomAllocationApplyInput,
): Promise<CustomAllocationApplied> {
  const previewId = input.previewId.trim();
  if (!previewId) {
    throw { code: "INVALID_PREVIEW_ID" };
  }

  if (
    input.teamNames !== undefined &&
    (!Array.isArray(input.teamNames) || input.teamNames.some((teamName) => typeof teamName !== "string"))
  ) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const preview = getStoredCustomAllocationPreview(previewId, staffId, projectId);
  if (!preview) {
    throw { code: "PREVIEW_NOT_FOUND_OR_EXPIRED" };
  }

  const requestedTeamNames = resolveCustomAllocationTeamNames(preview.previewTeams, input.teamNames);
  const plannedTeams = preview.previewTeams.map((team) => ({
    members: team.members.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    })),
  }));

  const currentlyVacantStudents = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    project.id,
  );
  const currentlyVacantStudentIds = new Set(currentlyVacantStudents.map((student) => student.id));
  const staleStudents = findStaleStudentsFromPreview(preview.previewTeams, currentlyVacantStudentIds);
  if (staleStudents.length > 0) {
    customAllocationPreviewCache.delete(previewId);
    throw {
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents,
    };
  }

  let appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  try {
    appliedTeams = await applyRandomAllocationPlan(
      project.id,
      project.enterpriseId,
      plannedTeams,
      {
        teamNames: requestedTeamNames,
        draftCreatedById: staffId,
      },
    );
  } catch (error: any) {
    if (error?.code === "STUDENTS_NO_LONGER_VACANT") {
      customAllocationPreviewCache.delete(previewId);
      const refreshedVacantStudents = await findVacantModuleStudentsForProject(
        project.enterpriseId,
        project.moduleId,
        project.id,
      );
      const refreshedVacantStudentIds = new Set(refreshedVacantStudents.map((student) => student.id));
      throw {
        code: "STUDENTS_NO_LONGER_VACANT",
        staleStudents: findStaleStudentsFromPreview(preview.previewTeams, refreshedVacantStudentIds),
      };
    }
    throw error;
  }
  customAllocationPreviewCache.delete(previewId);

  const studentCount = plannedTeams.reduce((sum, team) => sum + team.members.length, 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    previewId,
    studentCount,
    teamCount: preview.teamCount,
    appliedTeams,
  };
}

async function notifyStudentsAboutRandomAllocation(
  projectName: string,
  plannedTeams: Array<{
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>,
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>,
) {
  const assignments = plannedTeams.flatMap((team, index) => {
    const teamName = appliedTeams[index]?.teamName ?? `Team ${index + 1}`;
    return team.members.map((member) => ({ member, teamName }));
  });

  const results = await Promise.allSettled(
    assignments.map(({ member, teamName }) => {
      const firstName = member.firstName?.trim() || "there";
      const subject = `Team allocation updated - ${projectName}`;
      const text = [
        `Hi ${firstName},`,
        "",
        `Your team allocation for ${projectName} has been updated.`,
        `You are now assigned to: ${teamName}.`,
        "",
        "Log in to view your updated team workspace.",
      ].join("\n");

      return sendEmail({
        to: member.email,
        subject,
        text,
      });
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`Random allocation email notifications failed for ${failures.length} student(s).`);
  }
}

async function notifyStudentsAboutManualAllocation(
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  const results = await Promise.allSettled(
    students.map((student) => {
      const firstName = student.firstName?.trim() || "there";
      const subject = `Team allocation updated - ${projectName}`;
      const text = [
        `Hi ${firstName},`,
        "",
        `Your team allocation for ${projectName} has been updated.`,
        `You are now assigned to: ${teamName}.`,
        "",
        "Log in to view your updated team workspace.",
      ].join("\n");

      return sendEmail({
        to: student.email,
        subject,
        text,
      });
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`Manual allocation email notifications failed for ${failures.length} student(s).`);
  }
}

async function notifyStudentsAboutApprovedDraftTeam(
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  await notifyStudentsAboutManualAllocation(projectName, teamName, students);
}

function resolveRandomAllocationTeamNames(teamCount: number, teamNames?: string[]) {
  if (teamNames === undefined) {
    return Array.from({ length: teamCount }, (_, index) => `Random Team ${index + 1}`);
  }

  if (!Array.isArray(teamNames) || teamNames.length !== teamCount) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const normalizedNames = teamNames.map((teamName) => teamName.trim());
  if (normalizedNames.some((teamName) => teamName.length === 0)) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const uniqueNames = new Set(normalizedNames.map((teamName) => teamName.toLowerCase()));
  if (uniqueNames.size !== normalizedNames.length) {
    throw { code: "DUPLICATE_TEAM_NAMES" };
  }

  return normalizedNames;
}

export async function createTeamInvite(params: CreateTeamInviteParams) {
  const normalizedEmail = params.inviteeEmail.trim().toLowerCase();

  const teamRecord = await prisma.team.findUnique({
    where: { id: params.teamId },
    select: { archivedAt: true, allocationLifecycle: true },
  });
  if (!teamRecord) throw { code: "TEAM_NOT_FOUND" };
  if (teamRecord.archivedAt) throw { code: "TEAM_ARCHIVED" };
  if (teamRecord.allocationLifecycle !== "ACTIVE") throw { code: "TEAM_NOT_ACTIVE" };

  const inviterAllocation = await prisma.teamAllocation.findUnique({
    where: {
      teamId_userId: {
        teamId: params.teamId,
        userId: params.inviterId,
      },
    },
    select: { teamId: true },
  });
  if (!inviterAllocation) throw { code: "TEAM_ACCESS_FORBIDDEN" };

  const existing = await findActiveInvite(params.teamId, normalizedEmail);
  if (existing) {
    throw { code: "INVITE_ALREADY_PENDING" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + (params.expiresInMs ?? 7 * 24 * 60 * 60 * 1000));

  const invite = await createTeamInviteRecord({
    teamId: params.teamId,
    inviterId: params.inviterId,
    inviteeId: params.inviteeId ?? null,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt,
    message: params.message ?? null,
  });

  const { team, inviter } = await findInviteContext(params.teamId, params.inviterId);

  const textLines = [
    `You have been invited by ${inviter?.firstName ?? "a teammate"} ${
      inviter?.lastName ?? ""
    } (${inviter?.email ?? "unknown"}) to join the team "${
      team?.teamName ?? "Unknown Team"
    }".`,
    "Please log in to your account and RSVP to this invite.",
  ].filter(Boolean);

  await sendEmail({
    to: normalizedEmail,
    subject: "Team invitation",
    text: textLines.join("\n"),
  });

  const inviteeUserId = params.inviteeId ?? (
    await prisma.user.findFirst({ where: { email: normalizedEmail }, select: { id: true } })
  )?.id;

  if (inviteeUserId) {
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : "A teammate";
    await addNotification({
      userId: inviteeUserId,
      type: "TEAM_INVITE",
      message: `${inviterName} invited you to join "${team?.teamName ?? "a team"}"`,
      link: `/projects/${team?.projectId}/team`,
    });
  }

  return { invite, rawToken };
}

export async function listTeamInvites(teamId: number, requesterId?: number) {
  const teamRecord = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, archivedAt: true, allocationLifecycle: true },
  });
  if (!teamRecord || teamRecord.archivedAt || teamRecord.allocationLifecycle !== "ACTIVE") {
    throw { code: "TEAM_NOT_FOUND_OR_INACTIVE" };
  }
  if (!Number.isInteger(requesterId) || requesterId < 1) {
    throw { code: "TEAM_ACCESS_FORBIDDEN" };
  }

  const requesterAllocation = await prisma.teamAllocation.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: requesterId,
      },
    },
    select: { teamId: true },
  });
  if (!requesterAllocation) {
    throw { code: "TEAM_ACCESS_FORBIDDEN" };
  }

  return getInvitesForTeam(teamId);
}

export async function listReceivedInvites(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return findPendingInvitesForEmail(user.email);
}

export async function createTeam(userId: number, teamData: Parameters<typeof TeamService.createTeam>[1]) {
  const projectId = Number(teamData.projectId);
  if (!Number.isInteger(projectId) || projectId < 1) {
    throw { code: "INVALID_PROJECT_ID" };
  }

  const teamName = typeof teamData.teamName === "string" ? teamData.teamName.trim() : "";
  if (teamName.length === 0) {
    throw { code: "INVALID_TEAM_NAME" };
  }

  const scope = await resolveStudentTeamCreationScope(userId, projectId);
  return createStudentTeam(userId, scope, teamName);
}

export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const normalizedTeamName = teamName.trim();
  if (!normalizedTeamName) {
    throw { code: "INVALID_TEAM_NAME" };
  }
  const scope = await resolveStudentTeamCreationScope(userId, projectId);
  return createStudentTeam(userId, scope, normalizedTeamName);
}

export async function getTeamById(teamId: number) {
  return TeamService.getTeamById(teamId);
}

export async function addUserToTeam(teamId: number, userId: number, role: "OWNER" | "MEMBER" = "MEMBER") {
  return TeamService.addUserToTeam(teamId, userId, role);
}

export async function getTeamMembers(teamId: number) {
  return TeamService.getTeamMembers(teamId);
}

export async function getManualAllocationWorkspaceForProject(
  staffId: number,
  projectId: number,
  searchQuery: string | null = null,
): Promise<ManualAllocationWorkspace> {
  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const normalizedSearchQuery = normalizeManualAllocationSearchQuery(searchQuery);
  const [students, existingTeams] = await Promise.all([
    normalizedSearchQuery
      ? findModuleStudentsForManualAllocation(
          project.enterpriseId,
          project.moduleId,
          project.id,
          normalizedSearchQuery,
        )
      : findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id),
    findProjectTeamSummaries(project.id),
  ]);

  const studentsWithStatus = students.map((student) => {
    const isAssigned = student.currentTeamId !== null;
    const currentTeamId = student.currentTeamId;
    const currentTeam =
      currentTeamId !== null && student.currentTeamName
        ? {
            id: currentTeamId,
            teamName: student.currentTeamName,
          }
        : null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      status: isAssigned ? ("ALREADY_IN_TEAM" as const) : ("AVAILABLE" as const),
      currentTeam,
    };
  });

  const alreadyInTeamStudents = studentsWithStatus.filter((student) => student.status === "ALREADY_IN_TEAM").length;
  const availableStudents = studentsWithStatus.length - alreadyInTeamStudents;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    existingTeams,
    students: studentsWithStatus,
    counts: {
      totalStudents: studentsWithStatus.length,
      availableStudents,
      alreadyInTeamStudents,
    },
  };
}

export async function listAllocationDraftsForProject(
  staffId: number,
  projectId: number,
): Promise<AllocationDraftsWorkspace> {
  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const drafts = await findProjectDraftTeams(project.id);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    access: {
      actorRole: project.actorRole,
      isModuleLead: project.isModuleLead,
      isModuleTeachingAssistant: project.isModuleTeachingAssistant,
      canApproveAllocationDrafts: project.canApproveAllocationDrafts,
    },
    drafts: drafts.map(mapAllocationDraftTeamForResponse),
  };
}

export async function updateAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { teamName?: string; studentIds?: number[]; expectedUpdatedAt?: string },
): Promise<AllocationDraftUpdated> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  const hasTeamName = Object.prototype.hasOwnProperty.call(input, "teamName");
  const hasStudentIds = Object.prototype.hasOwnProperty.call(input, "studentIds");
  if (!hasTeamName && !hasStudentIds) {
    throw { code: "INVALID_DRAFT_UPDATE" };
  }

  let normalizedTeamName: string | undefined;
  if (hasTeamName) {
    if (typeof input.teamName !== "string") {
      throw { code: "INVALID_TEAM_NAME" };
    }
    normalizedTeamName = input.teamName.trim();
    if (normalizedTeamName.length === 0) {
      throw { code: "INVALID_TEAM_NAME" };
    }
  }

  let normalizedStudentIds: number[] | undefined;
  if (hasStudentIds) {
    if (
      !Array.isArray(input.studentIds) ||
      input.studentIds.some((studentId) => !Number.isInteger(studentId) || studentId < 1)
    ) {
      throw { code: "INVALID_STUDENT_IDS" };
    }
    const uniqueStudentIds = Array.from(new Set(input.studentIds));
    if (uniqueStudentIds.length !== input.studentIds.length) {
      throw { code: "INVALID_STUDENT_IDS" };
    }
    normalizedStudentIds = uniqueStudentIds;
  }

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const currentDraft = await findDraftTeamById(teamId);
  if (!currentDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && currentDraft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }

  if (normalizedTeamName !== undefined) {
    const teamNameAlreadyExists = await findTeamNameConflictInEnterprise(
      project.enterpriseId,
      normalizedTeamName,
      { excludeTeamId: teamId },
    );
    if (teamNameAlreadyExists) {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }
  }

  if (normalizedStudentIds !== undefined) {
    const moduleStudents = await findModuleStudentsByIdsInModule(
      project.enterpriseId,
      project.moduleId,
      normalizedStudentIds,
    );
    if (moduleStudents.length !== normalizedStudentIds.length) {
      throw { code: "STUDENT_NOT_IN_MODULE" };
    }

    const activeConflicts = await findStudentAllocationConflictsInProject(
      project.id,
      normalizedStudentIds,
      "ACTIVE",
      { excludeTeamId: teamId },
    );
    if (activeConflicts.length > 0) {
      throw { code: "STUDENT_ALREADY_ASSIGNED", conflicts: activeConflicts };
    }

    const draftConflicts = await findStudentAllocationConflictsInProject(
      project.id,
      normalizedStudentIds,
      "DRAFT",
      { excludeTeamId: teamId },
    );
    if (draftConflicts.length > 0) {
      throw { code: "STUDENT_IN_OTHER_DRAFT", conflicts: draftConflicts };
    }
  }

  await updateDraftTeam(teamId, {
    ...(normalizedTeamName !== undefined ? { teamName: normalizedTeamName } : {}),
    ...(normalizedStudentIds !== undefined ? { studentIds: normalizedStudentIds } : {}),
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });

  const updatedDraft = await findDraftTeamById(teamId);
  if (!updatedDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    access: {
      actorRole: project.actorRole,
      isModuleLead: project.isModuleLead,
      isModuleTeachingAssistant: project.isModuleTeachingAssistant,
      canApproveAllocationDrafts: project.canApproveAllocationDrafts,
    },
    draft: mapAllocationDraftTeamForResponse(updatedDraft),
  };
}

export async function approveAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { expectedUpdatedAt?: string } = {},
): Promise<AllocationDraftApproved> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }
  if (!project.canApproveAllocationDrafts) {
    throw { code: "APPROVAL_FORBIDDEN" };
  }

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const draft = await findDraftTeamById(teamId);
  if (!draft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }
  if (draft.memberCount === 0) {
    throw { code: "DRAFT_TEAM_HAS_NO_MEMBERS" };
  }

  const studentIds = draft.members.map((member) => member.id);
  const activeConflicts = await findStudentAllocationConflictsInProject(
    project.id,
    studentIds,
    "ACTIVE",
    { excludeTeamId: teamId },
  );
  if (activeConflicts.length > 0) {
    throw { code: "STUDENTS_NO_LONGER_AVAILABLE", conflicts: activeConflicts };
  }

  const approvedTeam = await approveDraftTeam(teamId, staffId, {
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });
  if (!approvedTeam) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  await notifyStudentsAboutApprovedDraftTeam(
    project.name,
    approvedTeam.teamName,
    approvedTeam.members.map((member) => ({
      firstName: member.firstName,
      email: member.email,
    })),
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    approvedTeam: {
      id: approvedTeam.id,
      teamName: approvedTeam.teamName,
      memberCount: approvedTeam.memberCount,
    },
  };
}

export async function deleteAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { expectedUpdatedAt?: string } = {},
): Promise<AllocationDraftDeleted> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const draft = await findDraftTeamById(teamId);
  if (!draft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }

  const isModuleOwner = project.canApproveAllocationDrafts;
  const isDraftCreator = draft.draftCreatedBy?.id === staffId;
  if (!isModuleOwner && !isDraftCreator) {
    throw { code: "DELETE_DRAFT_FORBIDDEN" };
  }

  const deletedDraft = await deleteDraftTeam(teamId, {
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });
  if (!deletedDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    deletedDraft,
  };
}

export async function applyManualAllocationForProject(
  staffId: number,
  projectId: number,
  input: { teamName: string; studentIds: number[] },
): Promise<ManualAllocationApplied> {
  const teamName = input.teamName.trim();
  if (teamName.length === 0) {
    throw { code: "INVALID_TEAM_NAME" };
  }
  if (
    !Array.isArray(input.studentIds) ||
    input.studentIds.length === 0 ||
    input.studentIds.some((studentId) => !Number.isInteger(studentId) || studentId < 1)
  ) {
    throw { code: "INVALID_STUDENT_IDS" };
  }

  const studentIds = Array.from(new Set(input.studentIds));
  if (studentIds.length !== input.studentIds.length) {
    throw { code: "INVALID_STUDENT_IDS" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const moduleStudents = await findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id);
  const moduleStudentById = new Map(moduleStudents.map((student) => [student.id, student] as const));

  const hasStudentOutsideModule = studentIds.some((studentId) => !moduleStudentById.has(studentId));
  if (hasStudentOutsideModule) {
    throw { code: "STUDENT_NOT_IN_MODULE" };
  }

  const hasStudentAlreadyAssigned = studentIds.some((studentId) => {
    const student = moduleStudentById.get(studentId);
    return student ? student.currentTeamId !== null : false;
  });
  if (hasStudentAlreadyAssigned) {
    throw { code: "STUDENT_ALREADY_ASSIGNED" };
  }

  const team = await applyManualAllocationTeam(
    project.id,
    project.enterpriseId,
    teamName,
    studentIds,
    { draftCreatedById: staffId },
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    team,
  };
}

export async function previewRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { seed?: number; minTeamSize?: number; maxTeamSize?: number } = {},
): Promise<RandomAllocationPreview> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }
  const teamSizeConstraints = normalizeTeamSizeConstraints({
    ...(options.minTeamSize !== undefined ? { minTeamSize: options.minTeamSize } : {}),
    ...(options.maxTeamSize !== undefined ? { maxTeamSize: options.maxTeamSize } : {}),
  });

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const students = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    projectId,
  );
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }

  const [plannedAllocation, existingTeams] = await Promise.all([
    Promise.resolve(
      buildConstrainedRandomPlan(students, teamCount, teamSizeConstraints, { seed: options.seed }),
    ),
    findProjectTeamSummaries(projectId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    studentCount: students.length,
    teamCount,
    existingTeams,
    previewTeams: plannedAllocation.teams.map((team, index) => ({
      index: team.index,
      suggestedName: `Random Team ${index + 1}`,
      members: team.members,
    })),
    unassignedStudents: plannedAllocation.unassignedStudents,
  };
}

export async function applyRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { seed?: number; teamNames?: string[]; minTeamSize?: number; maxTeamSize?: number } = {},
): Promise<RandomAllocationApplied> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }

  const teamNames = resolveRandomAllocationTeamNames(teamCount, options.teamNames);
  const teamSizeConstraints = normalizeTeamSizeConstraints({
    ...(options.minTeamSize !== undefined ? { minTeamSize: options.minTeamSize } : {}),
    ...(options.maxTeamSize !== undefined ? { maxTeamSize: options.maxTeamSize } : {}),
  });

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const students = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    projectId,
  );
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }
  const plannedAllocation = buildConstrainedRandomPlan(students, teamCount, teamSizeConstraints, {
    seed: options.seed,
  });
  const plannedTeams = plannedAllocation.teams;
  const appliedTeams = await applyRandomAllocationPlan(
    projectId,
    project.enterpriseId,
    plannedTeams,
    {
      teamNames,
      draftCreatedById: staffId,
    },
  );
  const assignedStudentCount = plannedTeams.reduce((sum, team) => sum + team.members.length, 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    studentCount: assignedStudentCount,
    teamCount,
    appliedTeams,
  };
}

async function transitionInviteFromPending(inviteId: string, status: TeamInviteStatus) {
  const invite = await updateInviteStatusFromPending(inviteId, status, new Date());

  if (!invite) {
    throw { code: "INVITE_NOT_PENDING" };
  }

  return invite;
}

export async function acceptTeamInvite(inviteId: string, userId: number) {
  const invite = await transitionInviteFromPending(inviteId, "ACCEPTED");
  // Add the accepting user to the team; ignore if already a member.
  await TeamService.addUserToTeam(invite.teamId, userId).catch((err: any) => {
    if (err?.code !== "MEMBER_ALREADY_EXISTS") throw err;
  });
  return invite;
}

export async function declineTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

// "REJECTED" is treated as an alias of DECLINED in current schema.
export async function rejectTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

export async function cancelTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "CANCELLED");
}

export async function expireTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "EXPIRED");
}

async function resolveStudentTeamCreationScope(
  userId: number,
  projectId: number,
): Promise<StudentTeamCreationScope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseId: true, role: true, active: true },
  });
  if (!user || !user.active) {
    throw { code: "USER_NOT_FOUND" };
  }
  if (user.role !== "STUDENT") {
    throw { code: "TEAM_CREATION_FORBIDDEN" };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      archivedAt: null,
      module: {
        enterpriseId: user.enterpriseId,
        userModules: {
          some: {
            userId,
            enterpriseId: user.enterpriseId,
          },
        },
      },
    },
    select: { id: true, module: { select: { enterpriseId: true } } },
  });
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }

  const existingAllocation = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    select: { teamId: true },
  });
  if (existingAllocation) {
    throw { code: "STUDENT_ALREADY_IN_TEAM" };
  }

  return {
    enterpriseId: project.module.enterpriseId,
    projectId: project.id,
  };
}

async function createStudentTeam(
  userId: number,
  scope: StudentTeamCreationScope,
  teamName: string,
) {
  try {
    return await TeamService.createTeam(userId, {
      enterpriseId: scope.enterpriseId,
      projectId: scope.projectId,
      teamName,
      allocationLifecycle: "ACTIVE",
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }
    throw error;
  }
}
