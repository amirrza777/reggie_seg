import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findCustomAllocationQuestionnairesForStaff,
  findCustomAllocationTemplateForStaff,
  findLatestCustomAllocationResponsesForStudents,
  findRespondingStudentIdsForTemplateInProject,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    questionnaireTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    peerAssessment: {
      findMany: vi.fn(),
    },
  },
}));

describe("teamAllocation repo custom allocation reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findCustomAllocationQuestionnairesForStaff fetches owned and public eligible templates", async () => {
    (prisma.questionnaireTemplate.findMany as any).mockResolvedValue([{ id: 1 }]);

    await expect(findCustomAllocationQuestionnairesForStaff(7)).resolves.toEqual([{ id: 1 }]);
    expect(prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ ownerId: 7 }, { isPublic: true }],
      },
      select: {
        id: true,
        templateName: true,
        ownerId: true,
        isPublic: true,
        questions: {
          where: {
            type: {
              in: ["multiple-choice", "multiple_choice", "rating", "slider"],
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
  });

  it("findCustomAllocationTemplateForStaff fetches a single accessible template", async () => {
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue({ id: 5 });

    await expect(findCustomAllocationTemplateForStaff(7, 5)).resolves.toEqual({ id: 5 });
    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        id: 5,
        OR: [{ ownerId: 7 }, { isPublic: true }],
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
  });

  it("findRespondingStudentIdsForTemplateInProject short-circuits for empty student list", async () => {
    await expect(findRespondingStudentIdsForTemplateInProject(42, 5, [])).resolves.toEqual([]);
    expect(prisma.peerAssessment.findMany).not.toHaveBeenCalled();
  });

  it("findRespondingStudentIdsForTemplateInProject returns distinct reviewer ids", async () => {
    (prisma.peerAssessment.findMany as any).mockResolvedValue([
      { reviewerUserId: 2 },
      { reviewerUserId: 4 },
    ]);

    await expect(findRespondingStudentIdsForTemplateInProject(42, 5, [1, 2, 3, 4])).resolves.toEqual([2, 4]);
    expect(prisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 42,
        templateId: 5,
        reviewerUserId: {
          in: [1, 2, 3, 4],
        },
      },
      select: {
        reviewerUserId: true,
      },
      distinct: ["reviewerUserId"],
    });
  });

  it("findLatestCustomAllocationResponsesForStudents short-circuits for empty student list", async () => {
    await expect(findLatestCustomAllocationResponsesForStudents(42, 5, [])).resolves.toEqual([]);
    expect(prisma.peerAssessment.findMany).not.toHaveBeenCalled();
  });

  it("findLatestCustomAllocationResponsesForStudents returns latest entry per reviewer", async () => {
    (prisma.peerAssessment.findMany as any).mockResolvedValue([
      {
        id: 31,
        reviewerUserId: 2,
        answersJson: { "11": "A" },
        submittedAt: new Date("2026-03-10T10:00:00.000Z"),
        updatedAt: new Date("2026-03-10T10:00:00.000Z"),
      },
      {
        id: 30,
        reviewerUserId: 2,
        answersJson: { "11": "B" },
        submittedAt: new Date("2026-03-09T10:00:00.000Z"),
        updatedAt: new Date("2026-03-09T10:00:00.000Z"),
      },
      {
        id: 40,
        reviewerUserId: 4,
        answersJson: [{ question: "11", answer: 3 }],
        submittedAt: new Date("2026-03-11T10:00:00.000Z"),
        updatedAt: new Date("2026-03-11T10:00:00.000Z"),
      },
    ]);

    await expect(findLatestCustomAllocationResponsesForStudents(42, 5, [1, 2, 3, 4])).resolves.toEqual([
      { reviewerUserId: 2, answersJson: { "11": "A" } },
      { reviewerUserId: 4, answersJson: [{ question: "11", answer: 3 }] },
    ]);
    expect(prisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 42,
        templateId: 5,
        reviewerUserId: {
          in: [1, 2, 3, 4],
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
  });
});