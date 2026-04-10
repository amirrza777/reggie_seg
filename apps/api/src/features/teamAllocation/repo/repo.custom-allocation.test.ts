import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    questionnaireTemplate: { findMany: vi.fn(), findFirst: vi.fn() },
    peerAssessment: { findMany: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  findCustomAllocationQuestionnairesForStaff,
  findCustomAllocationTemplateForStaff,
  findLatestCustomAllocationResponsesForStudents,
  findRespondingStudentIdsForTemplateInProject,
} from "./repo.custom-allocation.js";

describe("repo.custom-allocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries questionnaire listings for owner-or-public custom templates", async () => {
    mocks.prisma.questionnaireTemplate.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(findCustomAllocationQuestionnairesForStaff(7)).resolves.toEqual([{ id: 1 }]);
    expect(mocks.prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { purpose: "CUSTOMISED_ALLOCATION", OR: [{ ownerId: 7 }, { isPublic: true }] } }),
    );
  });

  it("queries a single staff-scoped template by id", async () => {
    mocks.prisma.questionnaireTemplate.findFirst.mockResolvedValue({ id: 3 });
    await expect(findCustomAllocationTemplateForStaff(7, 3)).resolves.toEqual({ id: 3 });
    expect(mocks.prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3, purpose: "CUSTOMISED_ALLOCATION", OR: [{ ownerId: 7 }, { isPublic: true }] } }),
    );
  });

  it("returns empty responders for empty student lists", async () => {
    await expect(findRespondingStudentIdsForTemplateInProject(1, 2, [])).resolves.toEqual([]);
    expect(mocks.prisma.peerAssessment.findMany).not.toHaveBeenCalled();
  });

  it("maps distinct reviewer ids from peer assessments", async () => {
    mocks.prisma.peerAssessment.findMany.mockResolvedValue([{ reviewerUserId: 10 }, { reviewerUserId: 12 }]);
    await expect(findRespondingStudentIdsForTemplateInProject(1, 2, [10, 12])).resolves.toEqual([10, 12]);
    expect(mocks.prisma.peerAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["reviewerUserId"] }),
    );
  });

  it("returns empty latest-response rows for empty student lists", async () => {
    await expect(findLatestCustomAllocationResponsesForStudents(1, 2, [])).resolves.toEqual([]);
    expect(mocks.prisma.peerAssessment.findMany).not.toHaveBeenCalled();
  });

  it("keeps only first sorted latest response per reviewer", async () => {
    mocks.prisma.peerAssessment.findMany.mockResolvedValue([
      { id: 3, reviewerUserId: 10, answersJson: { a: 1 } },
      { id: 2, reviewerUserId: 10, answersJson: { a: 2 } },
      { id: 1, reviewerUserId: 12, answersJson: { b: 1 } },
    ]);
    const rows = await findLatestCustomAllocationResponsesForStudents(1, 2, [10, 12]);
    expect(rows).toEqual([
      { reviewerUserId: 10, answersJson: { a: 1 } },
      { reviewerUserId: 12, answersJson: { b: 1 } },
    ]);
  });
});