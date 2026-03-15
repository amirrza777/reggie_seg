import { prisma } from "../../shared/db.js";
import { fetchProjectDeadline } from "../projects/service.js";
import {
  getTeammates,
  createPeerAssessment,
  getPeerAssessment,
  updatePeerAssessment,
  getTeammateAssessments,
  getQuestionsForProject,
  getPeerAssessmentById,
  getProjectQuestionnaireTemplate,
} from "./repo.js"

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function assertWindowOpen(
  kind: "ASSESSMENT",
  deadline: { assessmentOpenDate?: unknown; assessmentDueDate?: unknown } | null,
  now = new Date(),
) {
  if (!deadline) return;
  const openAt = asDate(deadline.assessmentOpenDate);
  const dueAt = asDate(deadline.assessmentDueDate);

  if (openAt && now < openAt) {
    throw {
      code: `${kind}_WINDOW_NOT_OPEN`,
      message: "Peer assessment is not open yet for your deadline profile",
      opensAt: openAt,
    };
  }
  return {
    isLate: Boolean(dueAt && now > dueAt),
    dueAt,
  };
}

export function fetchTeammates(userId: number, teamId: number) {
  return getTeammates(userId, teamId)
}

export async function saveAssessment(data: {
  projectId: number
  teamId: number
  reviewerUserId: number
  revieweeUserId: number
  templateId: number
  answersJson: any
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { archivedAt: true } });
  if (project?.archivedAt) throw { code: "PROJECT_ARCHIVED" };
  const reviewerDeadline = await fetchProjectDeadline(data.reviewerUserId, data.projectId);
  const window = assertWindowOpen("ASSESSMENT", reviewerDeadline);
  return createPeerAssessment({
    ...data,
    submittedLate: window?.isLate ?? false,
    effectiveDueDate: window?.dueAt ?? null,
  })
}

export function fetchAssessment(
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  return getPeerAssessment(projectId, teamId, reviewerId, revieweeId)
}

export async function updateAssessmentAnswers(assessmentId: number, answersJson: any) {
  const assessment = await getPeerAssessmentById(assessmentId);
  if (!assessment) {
    throw { code: "P2025" };
  }
  const reviewerDeadline = await fetchProjectDeadline(assessment.reviewerUserId, assessment.projectId);
  const window = assertWindowOpen("ASSESSMENT", reviewerDeadline);
  return updatePeerAssessment(assessmentId, answersJson, {
    submittedLate: Boolean(assessment.submittedLate || window?.isLate),
    effectiveDueDate: window?.dueAt ?? null,
  })
}

export function fetchTeammateAssessments(userId: number, projectId: number) {
  return getTeammateAssessments(userId, projectId)
}

export function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

export function fetchAssessmentById(assessmentId: number) {
  return getPeerAssessmentById(assessmentId);
}

export function fetchProjectQuestionnaireTemplate(projectId: number) {
  return getProjectQuestionnaireTemplate(projectId);
}
