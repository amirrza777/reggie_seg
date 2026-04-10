import { prisma } from "../../shared/db.js";
import type {
  CustomAllocationLatestResponse,
  CustomAllocationTemplate,
} from "./repo.types.js";

const CUSTOM_ALLOCATION_ELIGIBLE_TYPES = [
  "multiple-choice",
  "multiple_choice",
  "rating",
  "slider",
];

export async function findCustomAllocationQuestionnairesForStaff(
  staffId: number,
): Promise<CustomAllocationTemplate[]> {
  return prisma.questionnaireTemplate.findMany({
    where: {
      purpose: "CUSTOMISED_ALLOCATION",
      OR: [{ ownerId: staffId }, { isPublic: true }],
    },
    select: {
      id: true,
      templateName: true,
      ownerId: true,
      isPublic: true,
      questions: {
        where: {
          type: {
            in: CUSTOM_ALLOCATION_ELIGIBLE_TYPES,
          },
        },
        select: {
          id: true,
          label: true,
          type: true,
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ templateName: "asc" }, { id: "asc" }],
  });
}

export async function findCustomAllocationTemplateForStaff(
  staffId: number,
  templateId: number,
): Promise<CustomAllocationTemplate | null> {
  return prisma.questionnaireTemplate.findFirst({
    where: {
      id: templateId,
      purpose: "CUSTOMISED_ALLOCATION",
      OR: [{ ownerId: staffId }, { isPublic: true }],
    },
    select: {
      id: true,
      templateName: true,
      ownerId: true,
      isPublic: true,
      questions: {
        select: {
          id: true,
          label: true,
          type: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function findRespondingStudentIdsForTemplateInProject(
  projectId: number,
  templateId: number,
  studentIds: number[],
): Promise<number[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const responses = await prisma.peerAssessment.findMany({
    where: {
      projectId,
      templateId,
      reviewerUserId: {
        in: studentIds,
      },
    },
    select: {
      reviewerUserId: true,
    },
    distinct: ["reviewerUserId"],
  });

  return responses.map((response) => response.reviewerUserId);
}

export async function findLatestCustomAllocationResponsesForStudents(
  projectId: number,
  templateId: number,
  studentIds: number[],
): Promise<CustomAllocationLatestResponse[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const records = await prisma.peerAssessment.findMany({
    where: {
      projectId,
      templateId,
      reviewerUserId: {
        in: studentIds,
      },
    },
    select: {
      id: true,
      reviewerUserId: true,
      answersJson: true,
      submittedAt: true,
      updatedAt: true,
    },
    orderBy: [
      { reviewerUserId: "asc" },
      { submittedAt: "desc" },
      { updatedAt: "desc" },
      { id: "desc" },
    ],
  });

  const latestByReviewer = new Set<number>();
  const latestResponses: CustomAllocationLatestResponse[] = [];

  for (const record of records) {
    if (latestByReviewer.has(record.reviewerUserId)) {
      continue;
    }
    latestByReviewer.add(record.reviewerUserId);
    latestResponses.push({
      reviewerUserId: record.reviewerUserId,
      answersJson: record.answersJson,
    });
  }

  return latestResponses;
}