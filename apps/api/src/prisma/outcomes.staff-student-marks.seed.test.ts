import { beforeEach, describe, expect, it } from "vitest";

import { configState, prismaMock, randSentenceMock, resetOutcomesSeedMocks } from "./outcomes.seed.shared";
import { seedStaffStudentMarks } from "../../prisma/seed/outcomes";

describe("outcomes seeder staff student marks", () => {
  beforeEach(() => {
    resetOutcomesSeedMocks();
  });

  it("skips when no teams are present", async () => {
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

  it("skips when no staff/admin marker exists", async () => {
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

  it("filters to confirmed student recipients only", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { teamId: 10, userId: 101, user: { role: "STUDENT" } },
      { teamId: 10, userId: 102, user: { role: "STAFF" } },
      { teamId: 20, userId: 103, user: { role: "STUDENT" } },
    ]);
    prismaMock.moduleLead.findMany.mockResolvedValue([{ moduleId: 1, userId: 900 }]);
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

  it("skips when no confirmed student allocations exist", async () => {
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

  it("honors zero coverage and normalizes non-string feedback fallback", async () => {
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

  it("falls back to default formative feedback when generator output is invalid", async () => {
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
      data: [expect.objectContaining({ formativeFeedback: "Steady contribution and reliable collaboration across project work." })],
      skipDuplicates: true,
    });
  });

  it("falls back to default marker when module/project resolution is missing", async () => {
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

  it("deduplicates staff pool and handles reversed mark bounds", async () => {
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
    expect(payload.data[0]).toEqual(expect.objectContaining({ markerUserId: 77 }));
    expect(payload.data[0].mark).toBeGreaterThanOrEqual(40);
    expect(payload.data[0].mark).toBeLessThanOrEqual(90);
  });

  it("handles TA-only module pool and candidates outside team->project map", async () => {
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

  it("normalizes array sentence output", async () => {
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

  it("falls back for whitespace-only sentence output", async () => {
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
