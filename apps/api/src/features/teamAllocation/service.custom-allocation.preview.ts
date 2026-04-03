import crypto from "crypto";
import { assertProjectMutableForWrites } from "../../shared/projectWriteGuard.js";
import { planCustomAllocationTeams } from "./customAllocator.js";
import {
  findCustomAllocationTemplateForStaff,
  findLatestCustomAllocationResponsesForStudents,
  findStaffScopedProject,
  findVacantModuleStudentsForProject,
} from "./repo.js";
import {
  CUSTOM_ALLOCATION_PREVIEW_TTL_MS,
  normalizeCustomAllocationQuestionType,
  parseCustomAllocationAnswers,
  storeCustomAllocationPreview,
  type StoredCustomAllocationPreview,
} from "./service.custom-allocation.shared.js";
import {
  buildConstrainedCustomPopulation,
  normalizeTeamSizeConstraints,
} from "./service.shared.js";
import type {
  CustomAllocationPreview,
  CustomAllocationPreviewInput,
} from "./service.types.js";

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
  assertProjectMutableForWrites(project);

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