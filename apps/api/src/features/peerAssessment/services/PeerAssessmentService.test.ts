import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../shared/db.js", () => {
  const create = vi.fn();
  const findMany = vi.fn();
  const findUnique = vi.fn();
  return { prisma: { peerAssessment: { create, findMany, findUnique } } };
});

import { prisma } from "../../../shared/db.js";
import { PeerAssessmentService } from "./PeerAssessmentService.js";

const service = new PeerAssessmentService();
const mockPrisma = vi.mocked(prisma);

const selectFields = {
  id: true,
  answersJson: true,
  submittedAt: true,
  moduleId: true,
  projectId: true,
  teamId: true,
  reviewerUserId: true,
  revieweeUserId: true,
  questionnaireTemplateId: true,
  templateId: true,
  updatedAt: true,
  reviewee: { select: { firstName: true, lastName: true } },
};

beforeEach(() => vi.clearAllMocks());

describe("PeerAssessmentService", () => {
  it("creates assessment records", async () => {
    mockPrisma.peerAssessment.create.mockResolvedValue({ id: 10 } as any);
    const result = await service.createAssessment({} as any);
    expect(mockPrisma.peerAssessment.create).toHaveBeenCalledWith({ data: {} });
    expect(result.id).toBe(10);
  });

  it("fetches assessments authored by a student", async () => {
    mockPrisma.peerAssessment.findMany.mockResolvedValue([{ id: 1 }] as any);
    const result = await service.getAssessmentsByStudent(5);
    expect(mockPrisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: { reviewerUserId: 5 },
      include: { reviewee: { select: { firstName: true, lastName: true } } },
    });
    expect(result).toHaveLength(1);
  });

  it("retrieves feedback for a reviewee with selected columns", async () => {
    mockPrisma.peerAssessment.findMany.mockResolvedValue([] as any);
    await service.getFeedbackForStudent(9);
    expect(mockPrisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: { revieweeUserId: 9 },
      select: selectFields,
    });
  });

  it("finds one feedback item by id", async () => {
    mockPrisma.peerAssessment.findUnique.mockResolvedValue({ id: 7 } as any);
    const result = await service.getFeedbackById(7);
    expect(mockPrisma.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      include: { reviewee: { select: { firstName: true, lastName: true } } },
    });
    expect(result?.id).toBe(7);
  });
});
