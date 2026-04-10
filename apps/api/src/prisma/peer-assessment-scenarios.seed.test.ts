import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    question: { findMany: vi.fn() },
    project: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    teamAllocation: { findMany: vi.fn(), createMany: vi.fn() },
    projectDeadline: { upsert: vi.fn(), findUnique: vi.fn() },
    teamDeadlineOverride: { deleteMany: vi.fn() },
    studentDeadlineOverride: { deleteMany: vi.fn() },
    peerFeedback: { deleteMany: vi.fn() },
    peerAssessment: { deleteMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedPeerAssessmentProgressScenarios } from "../../prisma/seed/peer-assessment-scenarios";

describe("seedPeerAssessmentProgressScenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.project.findFirst.mockResolvedValue(null);
    let projectId = 100;
    prismaMock.project.create.mockImplementation(async ({ data }: any) => ({
      id: projectId++,
      questionnaireTemplateId: data.questionnaireTemplateId,
    }));
    prismaMock.project.update.mockImplementation(async ({ where }: any) => ({
      id: where.id,
      questionnaireTemplateId: 500,
    }));
    prismaMock.team.findUnique.mockResolvedValue(null);
    let teamId = 200;
    prismaMock.team.create.mockImplementation(async () => ({ id: teamId++ }));
    prismaMock.team.update.mockImplementation(async ({ where }: any) => ({ id: where.id }));
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 2 });
    prismaMock.projectDeadline.upsert.mockResolvedValue({});
    prismaMock.projectDeadline.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.teamDeadlineOverride.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.studentDeadlineOverride.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerFeedback.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.upsert.mockResolvedValue({ id: 1 });
  });

  it("skips when module or template is missing", async () => {
    const result = await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [],
      templates: [],
      users: [],
      usersByRole: { students: [] },
    } as any);

    expect(result).toBeUndefined();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("seeds scenario with student-only members (no admin required)", async () => {
    const result = await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Q1"] }],
      users: [{ id: 99, role: "STAFF" }],
      usersByRole: { students: [{ id: 21 }, { id: 22 }] },
    } as any);

    expect(result).toEqual({
      assessmentOpenProjectId: expect.any(Number),
      feedbackPendingProjectId: expect.any(Number),
    });
    expect(prismaMock.project.create).toHaveBeenCalled();
  });

  it("skips when there are not enough unique scenario members", async () => {
    const result = await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Q1"] }],
      users: [],
      usersByRole: { students: [{ id: 22 }] },
    } as any);

    expect(result).toBeUndefined();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("creates/updates both scenario projects and seeds pending assessments", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.project.findFirst
      .mockResolvedValueOnce({ id: 1000 })
      .mockResolvedValueOnce(null);
    prismaMock.team.findUnique
      .mockResolvedValueOnce({ id: 2000 })
      .mockResolvedValueOnce(null);
    prismaMock.teamAllocation.findMany
      .mockResolvedValueOnce([{ userId: 5 }])
      .mockResolvedValueOnce([]);

    const result = await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: [] }],
      users: [{ id: 7, role: "ADMIN" }],
      usersByRole: { students: [{ id: 21 }, { id: 22 }, { id: 23 }] },
    } as any);

    expect(result).toEqual({
      assessmentOpenProjectId: 1000,
      feedbackPendingProjectId: expect.any(Number),
    });
    expect(prismaMock.project.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.team.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.team.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.peerFeedback.deleteMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.peerAssessment.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerAssessment.upsert).toHaveBeenCalled();
  });

  it("uses template fallback labels and skips falsy scenario member ids", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.team.findUnique.mockResolvedValue(null);
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);

    await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Fallback A", "Fallback B"] }],
      users: [{ id: 7, role: "ADMIN" }],
      usersByRole: { students: [{ id: 0 }, { id: 22 }, { id: 23 }] },
    } as any);

    expect(prismaMock.peerAssessment.upsert).toHaveBeenCalled();
    const upsertPayload = prismaMock.peerAssessment.upsert.mock.calls[0]?.[0];
    expect(Object.keys(upsertPayload.create.answersJson)).toEqual(["Fallback A", "Fallback B"]);
  });

  it("skips student deadline override cleanup when project deadline is absent", async () => {
    prismaMock.projectDeadline.findUnique.mockResolvedValue(null);

    await seedPeerAssessmentProgressScenarios({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Q1"] }],
      users: [{ id: 7, role: "ADMIN" }],
      usersByRole: { students: [{ id: 21 }, { id: 22 }] },
    } as any);

    expect(prismaMock.teamDeadlineOverride.deleteMany).toHaveBeenCalled();
    expect(prismaMock.studentDeadlineOverride.deleteMany).not.toHaveBeenCalled();
  });
});
