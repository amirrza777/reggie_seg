import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn() },
    project: { findFirst: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    teamAllocation: { findMany: vi.fn(), createMany: vi.fn() },
    projectDeadline: { findUnique: vi.fn(), create: vi.fn() },
    question: { findMany: vi.fn() },
    peerAssessment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    peerFeedback: { findMany: vi.fn(), create: vi.fn() },
    staffTeamMarking: { findUnique: vi.fn(), create: vi.fn() },
    staffStudentMarking: { findMany: vi.fn(), createMany: vi.fn() },
    meeting: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    meetingMinutes: { findUnique: vi.fn(), create: vi.fn() },
    meetingAttendance: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedCompletedProjectScenario } from "../../prisma/seed/completed-project";

describe("seedCompletedProjectScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.create.mockResolvedValue({ id: 100, questionnaireTemplateId: 500 });
    prismaMock.team.findUnique.mockResolvedValue(null);
    prismaMock.team.update.mockResolvedValue({ id: 200 });
    prismaMock.team.create.mockResolvedValue({ id: 200 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 2 });
    prismaMock.projectDeadline.findUnique.mockResolvedValue(null);
    prismaMock.projectDeadline.create.mockResolvedValue({ id: 300 });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([]);
    prismaMock.peerAssessment.findUnique.mockResolvedValue(null);
    prismaMock.peerFeedback.findMany.mockResolvedValue([]);
    prismaMock.staffTeamMarking.findUnique.mockResolvedValue(null);
    prismaMock.staffStudentMarking.findMany.mockResolvedValue([]);
    prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 2 });
    prismaMock.meeting.findUnique.mockResolvedValue(null);
    prismaMock.meeting.findFirst.mockResolvedValue(null);
    prismaMock.meetingMinutes.findUnique.mockResolvedValue(null);
    prismaMock.meetingMinutes.create.mockResolvedValue({ id: 1 });
    prismaMock.meetingAttendance.findUnique.mockResolvedValue(null);
    prismaMock.meetingAttendance.create.mockResolvedValue({ meetingId: 1 });

    let assessmentId = 1000;
    prismaMock.peerAssessment.create.mockImplementation(async () => ({ id: assessmentId++ }));

    let meetingId = 5000;
    prismaMock.meeting.create.mockImplementation(async () => ({ id: meetingId++ }));
  });

  it("skips when module/template/marker dependencies are missing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await seedCompletedProjectScenario({
      enterprise: { id: "ent-1" },
      modules: [],
      templates: [],
      usersByRole: { adminOrStaff: [], students: [] },
    } as any);

    expect(result).toBeUndefined();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[seed] seedCompletedProjectScenario: success (0 rows seeded; skipped (missing module/template/marker))",
    );
    logSpy.mockRestore();
  });

  it("creates scenario data including assessments, marks, and meetings", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const context = {
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Technical quality", "Teamwork"] }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF" }],
        students: [{ id: 101, role: "STUDENT" }, { id: 102, role: "STUDENT" }],
      },
    } as any;

    const result = await seedCompletedProjectScenario(context);

    expect(result).toBeUndefined();
    expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.team.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [
        { teamId: 200, userId: 101 },
        { teamId: 200, userId: 102 },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.peerAssessment.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.peerFeedback.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.staffTeamMarking.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.staffStudentMarking.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ studentUserId: 101, markerUserId: 900 }),
        expect.objectContaining({ studentUserId: 102, markerUserId: 900 }),
      ]),
      skipDuplicates: true,
    });
    expect(prismaMock.meeting.create).toHaveBeenCalledTimes(4);
    expect(prismaMock.meetingMinutes.create).toHaveBeenCalledTimes(4);
    expect(prismaMock.meetingAttendance.create).toHaveBeenCalledTimes(8);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[seed] seedCompletedProjectScenario: success ("));
    logSpy.mockRestore();
  });

  it("skips when there are not enough team members", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    await seedCompletedProjectScenario({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Q1"] }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF" }],
        students: [],
      },
    } as any);

    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });

  it("reuses existing scenario records and covers typed question answers", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 302 }]);
    prismaMock.project.findFirst.mockResolvedValue({ id: 100, questionnaireTemplateId: 500 });
    prismaMock.team.findUnique.mockResolvedValue({ id: 200 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ userId: 101 }, { userId: 302 }]);
    prismaMock.projectDeadline.findUnique.mockResolvedValue({ id: 10 });
    prismaMock.question.findMany.mockResolvedValue([
      { id: 1, label: "Technical quality", type: "slider", order: 1, configs: { min: "bad", max: 10, step: null } },
      {
        id: 2,
        label: "Team alignment",
        type: "multiple-choice",
        order: 2,
        configs: { options: ["Strongly disagree", "Agree"] },
      },
      { id: 3, label: "Communication style", type: "text", order: 3, configs: null },
      { id: 4, label: "Fallback options", type: "multiple_choice", order: 4, configs: { options: [] } },
      { id: 5, label: "Invalid slider config", type: "slider", order: 5, configs: [] },
      { id: 6, label: "No options config", type: "multiple_choice", order: 6, configs: {} },
      { id: 7, label: "General reflection", type: "text", order: 7, configs: null },
    ]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([{ id: 77, reviewerUserId: 302, revieweeUserId: 101 }]);
    prismaMock.peerAssessment.findUnique.mockResolvedValue({ id: 77 });
    prismaMock.peerFeedback.findMany.mockResolvedValue([{ peerAssessmentId: 77 }]);
    prismaMock.staffTeamMarking.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.staffStudentMarking.findMany.mockResolvedValue([{ studentUserId: 101 }]);
    prismaMock.meeting.findFirst.mockResolvedValue({ id: 600 });
    prismaMock.meeting.findUnique.mockResolvedValue({ id: 600 });
    prismaMock.meetingMinutes.findUnique.mockResolvedValue({ id: 700 });
    prismaMock.meetingAttendance.findUnique.mockResolvedValue({ meetingId: 600 });

    await seedCompletedProjectScenario({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: [] }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF" }],
        students: [{ id: 101, role: "STUDENT" }],
      },
    } as any);

    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.team.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.teamAllocation.createMany).not.toHaveBeenCalled();
    expect(prismaMock.projectDeadline.create).not.toHaveBeenCalled();
    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalled();
    expect(prismaMock.peerFeedback.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.staffTeamMarking.create).not.toHaveBeenCalled();
    expect(prismaMock.staffStudentMarking.createMany).not.toHaveBeenCalled();
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
    expect(prismaMock.meetingMinutes.create).not.toHaveBeenCalled();
    expect(prismaMock.meetingAttendance.create).not.toHaveBeenCalled();
  });

  it("handles falsy member ids, missing assessment lookups, and marker organiser fallback", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 102 }]);
    prismaMock.project.findFirst.mockResolvedValue({ id: 100, questionnaireTemplateId: 500 });
    prismaMock.team.findUnique.mockResolvedValue({ id: 200 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.projectDeadline.findUnique.mockResolvedValue({ id: 10 });
    prismaMock.question.findMany.mockResolvedValue([{ id: 1, label: "Q1", type: "text", order: 1, configs: null }]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([{ id: 55, reviewerUserId: 101, revieweeUserId: 102 }]);
    prismaMock.peerAssessment.findUnique.mockResolvedValue(null);
    prismaMock.peerFeedback.findMany.mockResolvedValue([]);
    prismaMock.staffTeamMarking.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.staffStudentMarking.findMany.mockResolvedValue([]);
    prismaMock.meeting.findFirst.mockResolvedValue(null);
    prismaMock.meeting.findFirst.mockResolvedValueOnce({ id: 600 }).mockResolvedValue(null);
    prismaMock.meeting.findUnique.mockResolvedValueOnce(null).mockResolvedValue(null);
    prismaMock.meetingMinutes.findUnique.mockResolvedValue(null);
    prismaMock.meetingAttendance.findUnique.mockResolvedValue(null);

    await seedCompletedProjectScenario({
      enterprise: { id: "ent-1" },
      modules: [{ id: 11 }],
      templates: [{ id: 500, questionLabels: ["Q1"] }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF" }],
        students: [{ id: undefined, role: "STUDENT" }, { id: 0, role: "STUDENT" }, { id: 101, role: "STUDENT" }],
      },
    } as any);

    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: { id: 55 },
      select: { id: true },
    });
    expect(prismaMock.peerAssessment.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerFeedback.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.meeting.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organiserId: 900 }),
      }),
    );
    const attendancePayloads = prismaMock.meetingAttendance.create.mock.calls.map((call) => call[0]?.data);
    expect(attendancePayloads.every((payload: any) => payload.userId > 0)).toBe(true);
  });
});
