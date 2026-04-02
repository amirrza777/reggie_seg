import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, randSentenceMock, configState } = vi.hoisted(() => ({
  prismaMock: {
    projectDeadline: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
    },
    moduleLead: {
      findMany: vi.fn(),
    },
    moduleTeachingAssistant: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    staffStudentMarking: {
      createMany: vi.fn(),
    },
    peerAssessment: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    peerFeedback: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  randSentenceMock: vi.fn().mockReturnValue("Consistent contributor with reliable communication."),
  configState: {
    SEED_STUDENT_MARK_MIN: 40,
    SEED_STUDENT_MARK_MAX: 90,
    SEED_STUDENT_MARK_COVERAGE: 1,
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("@ngneat/falso", () => ({
  randSentence: randSentenceMock,
}));

vi.mock("../../prisma/seed/config", () => ({
  get SEED_STUDENT_MARK_MIN() {
    return configState.SEED_STUDENT_MARK_MIN;
  },
  get SEED_STUDENT_MARK_MAX() {
    return configState.SEED_STUDENT_MARK_MAX;
  },
  get SEED_STUDENT_MARK_COVERAGE() {
    return configState.SEED_STUDENT_MARK_COVERAGE;
  },
}));

import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines, seedStaffStudentMarks } from "../../prisma/seed/outcomes";

describe("outcomes seeders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.projectDeadline.findMany.mockResolvedValue([]);
    prismaMock.projectDeadline.upsert.mockResolvedValue({});
    prismaMock.featureFlag.findMany.mockResolvedValue([]);
    prismaMock.featureFlag.upsert.mockResolvedValue({});
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.moduleLead.findMany.mockResolvedValue([]);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.findMany.mockResolvedValue([]);
    prismaMock.peerAssessment.update.mockResolvedValue({ id: 1 });
    prismaMock.peerAssessment.create.mockResolvedValue({ id: 2 });
    prismaMock.peerFeedback.findMany.mockResolvedValue([]);
    prismaMock.peerFeedback.upsert.mockResolvedValue({});
    randSentenceMock.mockReturnValue("Consistent contributor with reliable communication.");
    configState.SEED_STUDENT_MARK_MIN = 40;
    configState.SEED_STUDENT_MARK_MAX = 90;
    configState.SEED_STUDENT_MARK_COVERAGE = 1;
  });

  it("seedProjectDeadlines skips empty project list", async () => {
    const result = await seedProjectDeadlines([]);
    expect(result).toBeUndefined();
    expect(prismaMock.projectDeadline.upsert).not.toHaveBeenCalled();
  });

  it("seedProjectDeadlines upserts deadlines and counts only new projects", async () => {
    prismaMock.projectDeadline.findMany.mockResolvedValue([{ projectId: 2 }]);

    await seedProjectDeadlines([
      { id: 1, moduleId: 1, templateId: 1 },
      { id: 2, moduleId: 1, templateId: 1 },
    ] as any);

    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 1 },
      }),
    );
  });

  it("seedFeatureFlags returns created count based on existing keys", async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([{ key: "peer_feedback" }]);

    await seedFeatureFlags("ent-1");

    expect(prismaMock.featureFlag.upsert).toHaveBeenCalled();
    expect(prismaMock.featureFlag.upsert.mock.calls.length).toBeGreaterThan(1);
  });

  it("seedFeatureFlags reports zero created when all keys already exist", async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([
      { key: "peer_feedback" },
      { key: "modules" },
      { key: "repos" },
    ]);

    await seedFeatureFlags("ent-1");

    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(3);
  });

  it("seedStaffStudentMarks skips when no teams are present", async () => {
    const context = {
      teams: [],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [],
      projects: [],
    } as any;
    const result = await seedStaffStudentMarks(context);
    expect(result).toBeUndefined();
    expect(prismaMock.staffStudentMarking.createMany).not.toHaveBeenCalled();
  });

  it("seedStaffStudentMarks skips when no staff/admin marker exists", async () => {
    const context = {
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any;
    const result = await seedStaffStudentMarks(context);
    expect(result).toBeUndefined();
    expect(prismaMock.staffStudentMarking.createMany).not.toHaveBeenCalled();
  });

  it("seedStaffStudentMarks filters to confirmed student recipients only", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { teamId: 10, userId: 101, user: { role: "STUDENT" } },
      { teamId: 10, userId: 102, user: { role: "STAFF" } },
      { teamId: 20, userId: 103, user: { role: "STUDENT" } },
    ]);
    prismaMock.moduleLead.findMany.mockResolvedValue([{ moduleId: 1, userId: 900 }]);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }, { id: 103 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 2 });

    const context = {
      teams: [{ id: 10, projectId: 100 }, { id: 20, projectId: 200 }],
      usersByRole: { adminOrStaff: [{ id: 500, role: "STAFF" }], students: [{ id: 101, role: "STUDENT" }] },
      modules: [{ id: 1 }, { id: 2 }],
      projects: [
        { id: 100, moduleId: 1, templateId: 1 },
        { id: 200, moduleId: 2, templateId: 1 },
      ],
    } as any;

    await seedStaffStudentMarks(context);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls[0]?.[0];
    expect(payload.skipDuplicates).toBe(true);
    expect(payload.data).toHaveLength(2);
    expect(payload.data.every((row: any) => row.studentUserId === 101 || row.studentUserId === 103)).toBe(true);
    expect(payload.data.every((row: any) => row.studentUserId !== 102)).toBe(true);
  });

  it("seedStaffStudentMarks skips when no confirmed student allocations exist", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STAFF" } }]);
    prismaMock.user.findMany.mockResolvedValue([]);

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    expect(prismaMock.staffStudentMarking.createMany).not.toHaveBeenCalled();
  });

  it("seedStaffStudentMarks honors zero coverage and normalizes non-string feedback fallback", async () => {
    configState.SEED_STUDENT_MARK_COVERAGE = 0;
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    randSentenceMock.mockReturnValue(undefined as any);

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    expect(prismaMock.staffStudentMarking.createMany).not.toHaveBeenCalled();
  });

  it("seedStaffStudentMarks falls back to default formative feedback when generator output is invalid", async () => {
    configState.SEED_STUDENT_MARK_COVERAGE = 1;
    randSentenceMock.mockReturnValue(undefined as any);
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    expect(prismaMock.staffStudentMarking.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          formativeFeedback: "Steady contribution and reliable collaboration across project work.",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("seedStaffStudentMarks falls back to default marker when module/project resolution is missing", async () => {
    configState.SEED_STUDENT_MARK_COVERAGE = 1;
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.moduleLead.findMany.mockResolvedValue([{ moduleId: 1, userId: 77 }]);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([{ moduleId: 1, userId: 77 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 999 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls.at(-1)?.[0];
    expect(payload.data[0]).toEqual(expect.objectContaining({ markerUserId: 1 }));
  });

  it("seedPeerAssessments skips missing projects/templates and teams with invalid setup", async () => {
    await seedPeerAssessments([], [{ id: 10, projectId: 100 }], [{ id: 1, questionLabels: ["Q1"] }] as any);
    await seedPeerAssessments([{ id: 100, moduleId: 1, templateId: 1 }], [], []);

    prismaMock.teamAllocation.findMany.mockResolvedValue([{ user: { id: 1 } }]);
    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 999 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );
    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
  });

  it("seedPeerAssessments creates/updates assessments and upserts feedback", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 1 } },
      { user: { id: 2 } },
    ]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([
      { id: 77, reviewerUserId: 1, revieweeUserId: 2 },
    ]);
    prismaMock.peerFeedback.findMany.mockResolvedValue([{ peerAssessmentId: 77 }]);
    prismaMock.peerAssessment.update.mockResolvedValue({ id: 77 });
    prismaMock.peerAssessment.create.mockResolvedValue({ id: 88 });

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Technical", "Communication"] }] as any,
    );

    expect(prismaMock.peerAssessment.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerAssessment.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerFeedback.upsert).toHaveBeenCalledTimes(2);
  });

  it("seedPeerAssessments skips falsy reviewer/reviewee ids", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 0 } },
      { user: { id: 2 } },
    ]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([]);
    prismaMock.peerFeedback.findMany.mockResolvedValue([]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerFeedback.upsert).not.toHaveBeenCalled();
  });

  it("seedPeerAssessments skips teams when project template mapping is missing", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 1 } },
      { user: { id: 2 } },
    ]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 999 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerAssessment.update).not.toHaveBeenCalled();
  });

  it("seedPeerAssessments skips teams with fewer than two members", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ user: { id: 1 } }]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerAssessment.update).not.toHaveBeenCalled();
  });

  it("seedStaffStudentMarks deduplicates staff pool and handles reversed mark bounds", async () => {
    configState.SEED_STUDENT_MARK_MIN = 90;
    configState.SEED_STUDENT_MARK_MAX = 40;
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.moduleLead.findMany.mockResolvedValue([{ moduleId: 1, userId: 77 }]);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([{ moduleId: 1, userId: 77 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls.at(-1)?.[0];
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        markerUserId: 77,
      }),
    );
    expect(payload.data[0].mark).toBeGreaterThanOrEqual(40);
    expect(payload.data[0].mark).toBeLessThanOrEqual(90);
  });

  it("seedStaffStudentMarks handles TA-only module pool and candidates outside team->project map", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 999, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.moduleLead.findMany.mockResolvedValue([]);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([{ moduleId: 1, userId: 88 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls.at(-1)?.[0];
    expect(payload.data[0]).toEqual(expect.objectContaining({ markerUserId: 1, studentUserId: 101 }));
  });

  it("seedStaffStudentMarks normalizes array sentence output", async () => {
    randSentenceMock.mockReturnValue(["  Strong communicator  "] as any);
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls.at(-1)?.[0];
    expect(payload.data[0].formativeFeedback).toBe("Strong communicator");
  });

  it("seedStaffStudentMarks falls back for whitespace-only sentence output", async () => {
    randSentenceMock.mockReturnValue("   ");
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 10, userId: 101, user: { role: "STUDENT" } }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 101 }]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 1 });

    await seedStaffStudentMarks({
      teams: [{ id: 10, projectId: 100 }],
      usersByRole: { adminOrStaff: [{ id: 1, role: "STAFF" }], students: [] },
      modules: [{ id: 1 }],
      projects: [{ id: 100, moduleId: 1, templateId: 1 }],
    } as any);

    const payload = prismaMock.staffStudentMarking.createMany.mock.calls.at(-1)?.[0];
    expect(payload.data[0].formativeFeedback).toBe("Steady contribution and reliable collaboration across project work.");
  });
});
