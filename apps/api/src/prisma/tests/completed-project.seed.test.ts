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
    peerFeedback: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    staffTeamMarking: { findUnique: vi.fn(), create: vi.fn() },
    staffStudentMarking: { findMany: vi.fn(), createMany: vi.fn() },
    meeting: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    meetingMinutes: { findUnique: vi.fn(), create: vi.fn() },
    meetingAttendance: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedCompletedProjectScenario } from "../../../prisma/seed/completed-project";

describe("seedCompletedProjectScenario", registerCompletedProjectTests);

function registerCompletedProjectTests() {
  beforeEach(() => {
    arrangeCompletedProjectDefaults();
  });
  registerMissingDependencyTest();
  registerCreateScenarioTest();
  registerInsufficientMembersTest();
}

function registerMissingDependencyTest() {
  it("skips when module/template/marker dependencies are missing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await seedCompletedProjectScenario({
      enterprise: { id: "ent-1" },
      modules: [],
      templates: [],
      usersByRole: { adminOrStaff: [], students: [] },
    } as never);

    expect(result).toBeUndefined();
    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[seed] seedCompletedProjectScenario: success (0 rows seeded; skipped (missing module/template/marker))",
    );
    logSpy.mockRestore();
  });
}

function registerCreateScenarioTest() {
  it("creates scenario data including assessments, marks, and meetings", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await seedCompletedProjectScenario(makeCompletedProjectContext() as never);
    expect(result).toBeUndefined();
    expectScenarioCreatedCoreArtifacts();
    expectScenarioCreatedAssessmentAndMarkingArtifacts();
    expectScenarioCreatedMeetingArtifacts(logSpy);
    logSpy.mockRestore();
  });
}

function registerInsufficientMembersTest() {
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
    } as never);

    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });
}

function arrangeCompletedProjectDefaults() {
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
  prismaMock.peerFeedback.update.mockResolvedValue({ id: 1 });
  prismaMock.staffTeamMarking.findUnique.mockResolvedValue(null);
  prismaMock.staffStudentMarking.findMany.mockResolvedValue([]);
  prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 2 });
  prismaMock.meeting.findUnique.mockResolvedValue(null);
  prismaMock.meeting.findFirst.mockResolvedValue(null);
  prismaMock.meetingMinutes.findUnique.mockResolvedValue(null);
  prismaMock.meetingMinutes.create.mockResolvedValue({ id: 1 });
  prismaMock.meetingAttendance.findUnique.mockResolvedValue(null);
  prismaMock.meetingAttendance.create.mockResolvedValue({ meetingId: 1 });
  arrangeIncrementingCreators();
}

function arrangeIncrementingCreators() {
  let assessmentId = 1000;
  prismaMock.peerAssessment.create.mockImplementation(async () => ({ id: assessmentId++ }));
  let meetingId = 5000;
  prismaMock.meeting.create.mockImplementation(async () => ({ id: meetingId++ }));
}

function makeCompletedProjectContext(overrides?: Record<string, unknown>) {
  return {
    enterprise: { id: "ent-1" },
    modules: [{ id: 11 }],
    templates: [{ id: 500, questionLabels: ["Technical quality", "Teamwork"] }],
    usersByRole: {
      adminOrStaff: [{ id: 900, role: "STAFF" }],
      students: [{ id: 101, role: "STUDENT" }, { id: 102, role: "STUDENT" }],
    },
    ...(overrides ?? {}),
  };
}

function expectScenarioCreatedCoreArtifacts() {
  expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
  expect(prismaMock.team.create).toHaveBeenCalledTimes(1);
  expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledWith({
    data: [{ teamId: 200, userId: 101 }, { teamId: 200, userId: 102 }],
    skipDuplicates: true,
  });
}

function expectScenarioCreatedAssessmentAndMarkingArtifacts() {
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
}

function expectScenarioCreatedMeetingArtifacts(logSpy: ReturnType<typeof vi.spyOn>) {
  expect(prismaMock.meeting.create).toHaveBeenCalledTimes(4);
  expect(prismaMock.meetingMinutes.create).toHaveBeenCalledTimes(4);
  expect(prismaMock.meetingAttendance.create).toHaveBeenCalledTimes(8);
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[seed] seedCompletedProjectScenario: success ("));
}
