import { assertProjectMutableForWrites } from "../../shared/projectWriteGuard.js";
import {
  findCustomAllocationQuestionnairesForStaff,
  findCustomAllocationTemplateForStaff,
  findRespondingStudentIdsForTemplateInProject,
  findStaffScopedProject,
  findVacantModuleStudentsForProject,
} from "./repo.js";
import type {
  CustomAllocationCoverage,
  CustomAllocationQuestionnaireListing,
} from "./service.types.js";
import {
  getCustomAllocationResponseThreshold,
  normalizeCustomAllocationQuestionType,
} from "./service.custom-allocation.shared.js";

export async function listCustomAllocationQuestionnairesForProject(
  staffId: number,
  projectId: number,
): Promise<CustomAllocationQuestionnaireListing> {
  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

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
  assertProjectMutableForWrites(project);

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