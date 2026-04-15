import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    teamAllocation: { deleteMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    projectDeadline: { upsert: vi.fn(), findUnique: vi.fn() },
    teamDeadlineOverride: { deleteMany: vi.fn() },
    studentDeadlineOverride: { deleteMany: vi.fn() },
    question: { findMany: vi.fn() },
    peerFeedback: { deleteMany: vi.fn(), upsert: vi.fn() },
    peerAssessment: { deleteMany: vi.fn(), upsert: vi.fn() },
    staffTeamMarking: { deleteMany: vi.fn() },
    staffStudentMarking: { deleteMany: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedCompletedUnmarkedStudentViewScenario } from "../../../prisma/seed/peerAssessmentScenario/peer-assessment-completed-unmarked-scenario";
import { makeSeedContext } from "../test-helpers/seed-context";

describe("seedCompletedUnmarkedStudentViewScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.update.mockResolvedValue({ id: 31, questionnaireTemplateId: 21 });
    prismaMock.project.create.mockResolvedValue({ id: 31, questionnaireTemplateId: 21 });
    prismaMock.team.findUnique.mockResolvedValue(null);
    prismaMock.team.update.mockResolvedValue({ id: 41 });
    prismaMock.team.create.mockResolvedValue({ id: 41 });
    prismaMock.teamAllocation.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.projectDeadline.upsert.mockResolvedValue({});
    prismaMock.projectDeadline.findUnique.mockResolvedValue({ id: 91 });
    prismaMock.teamDeadlineOverride.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.studentDeadlineOverride.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.question.findMany.mockResolvedValue([{ label: "Q1" }]);
    prismaMock.peerFeedback.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.deleteMany.mockResolvedValue({ count: 0 });
    let assessmentId = 100;
    prismaMock.peerAssessment.upsert.mockImplementation(async () => ({ id: ++assessmentId }));
    prismaMock.peerFeedback.upsert.mockResolvedValue({ id: 1 });
    prismaMock.staffTeamMarking.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.staffStudentMarking.deleteMany.mockResolvedValue({ count: 2 });
  });

  it("covers existing project/team update branches", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 31, questionnaireTemplateId: 21 });
    prismaMock.team.findUnique.mockResolvedValue({ id: 41 });

    const context = makeSeedContext({
      enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
      users: [
        { id: 777, role: "STUDENT", email: "student.assessment@example.com" },
        { id: 101, role: "STUDENT", email: "s1@example.com" },
        { id: 102, role: "STUDENT", email: "s2@example.com" },
      ],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }],
        students: [
          { id: 101, role: "STUDENT", email: "s1@example.com" },
          { id: 102, role: "STUDENT", email: "s2@example.com" },
          { id: 103, role: "STUDENT", email: "s3@example.com" },
        ],
      },
    });

    const seeded = await seedCompletedUnmarkedStudentViewScenario(context, 11, 21, ["Q1"]);
    expect(seeded).toEqual(
      expect.objectContaining({
        projectId: 31,
        teamId: 41,
        assessmentCount: expect.any(Number),
        feedbackCount: expect.any(Number),
      }),
    );
    expect(prismaMock.project.update).toHaveBeenCalled();
    expect(prismaMock.team.update).toHaveBeenCalled();
  });

  it("returns null when fewer than two valid members are resolved", async () => {
    const context = makeSeedContext({
      users: [{ id: 777, role: "STUDENT", email: "student.assessment@example.com" }],
      usersByRole: { adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }], students: [] },
    });
    await expect(seedCompletedUnmarkedStudentViewScenario(context, 11, 21, ["Q1"])).resolves.toBeNull();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("covers random-student member branch when assessment student account is absent", async () => {
    const context = makeSeedContext({
      users: [{ id: 101, role: "STUDENT", email: "s1@example.com" }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }],
        students: [
          { id: 101, role: "STUDENT", email: "s1@example.com" },
          { id: 102, role: "STUDENT", email: "s2@example.com" },
          { id: 103, role: "STUDENT", email: "s3@example.com" },
        ],
      },
    });

    const seeded = await seedCompletedUnmarkedStudentViewScenario(context, 11, 21, ["Q1"]);
    expect(seeded).toEqual(expect.objectContaining({ memberCount: expect.any(Number) }));
  });

  it("covers users nullish-fallback branch when context.users is missing", async () => {
    const context = makeSeedContext({
      users: undefined as never,
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }],
        students: [
          { id: 101, role: "STUDENT", email: "s1@example.com" },
          { id: 102, role: "STUDENT", email: "s2@example.com" },
          { id: 103, role: "STUDENT", email: "s3@example.com" },
        ],
      },
    });

    await expect(seedCompletedUnmarkedStudentViewScenario(context, 11, 21, ["Q1"])).resolves.toEqual(
      expect.objectContaining({ memberCount: expect.any(Number) }),
    );
  });
});
