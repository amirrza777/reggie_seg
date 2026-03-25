import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    questionnaireTemplate: { findMany: vi.fn(), findFirst: vi.fn() },
    peerAssessment: { findMany: vi.fn() },
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  findCustomAllocationQuestionnairesForStaff,
  findLatestCustomAllocationResponsesForStudents,
  findRespondingStudentIdsForTemplateInProject,
} from "./repo.custom-allocation.js";

describe("repo custom-allocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty responses for empty student list", async () => {
    await expect(findRespondingStudentIdsForTemplateInProject(1, 2, [])).resolves.toEqual([]);
    expect(mocks.prisma.peerAssessment.findMany).not.toHaveBeenCalled();
  });

  it("queries questionnaire templates with staff/public filter", async () => {
    mocks.prisma.questionnaireTemplate.findMany.mockResolvedValue([]);
    await findCustomAllocationQuestionnairesForStaff(7);
    expect(mocks.prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ ownerId: 7 }, { isPublic: true }] } }),
    );
  });

  it("keeps only latest response per reviewer", async () => {
    mocks.prisma.peerAssessment.findMany.mockResolvedValue([
      { id: 2, reviewerUserId: 10, answersJson: { a: 1 } },
      { id: 1, reviewerUserId: 10, answersJson: { a: 2 } },
      { id: 3, reviewerUserId: 12, answersJson: { b: 3 } },
    ]);
    const result = await findLatestCustomAllocationResponsesForStudents(1, 2, [10, 12]);
    expect(result).toEqual([{ reviewerUserId: 10, answersJson: { a: 1 } }, { reviewerUserId: 12, answersJson: { b: 3 } }]);
  });
});