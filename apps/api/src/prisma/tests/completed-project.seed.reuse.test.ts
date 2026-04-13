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

describe("seedCompletedProjectScenario reuse and edge cases", () => {
  beforeEach(() => {
    arrangeCompletedProjectDefaults();
  });

  it("reuses existing scenario records and covers typed question answers", async () => {
    arrangeExistingScenarioReuseCase();
    await seedCompletedProjectScenario(makeCompletedProjectContext({ templates: [{ id: 500, questionLabels: [] }] }) as never);
    expectScenarioReusedWithoutCreates();
    expectPeerFeedbackAndAssessmentReuseBehavior();
    expectMeetingArtifactsReused();
  });

  it("skips update when peerFeedback delegate has no update function", async () => {
    arrangeExistingScenarioReuseCase();
    const originalUpdate = prismaMock.peerFeedback.update;
    (prismaMock.peerFeedback as { update?: unknown }).update = undefined;
    await seedCompletedProjectScenario(makeCompletedProjectContext({ templates: [{ id: 500, questionLabels: [] }] }) as never);
    expect(prismaMock.peerFeedback.create.mock.calls.length).toBeGreaterThan(0);
    (prismaMock.peerFeedback as { update?: unknown }).update = originalUpdate;
  });

  it("handles falsy member ids, missing assessment lookups, and marker organiser fallback", async () => {
    arrangeFallbackEdgeCase();
    await seedCompletedProjectScenario(makeFallbackEdgeCaseContext() as never);
    expectFallbackEdgeCaseAssessmentBehavior();
    expectFallbackEdgeCaseMeetingBehavior();
  });
});

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

function arrangeExistingScenarioReuseCase() {
  prismaMock.user.findMany.mockResolvedValue([{ id: 302 }]);
  prismaMock.project.findFirst.mockResolvedValue({ id: 100, questionnaireTemplateId: 500 });
  prismaMock.team.findUnique.mockResolvedValue({ id: 200 });
  prismaMock.teamAllocation.findMany.mockResolvedValue([{ userId: 101 }, { userId: 302 }]);
  prismaMock.projectDeadline.findUnique.mockResolvedValue({ id: 10 });
  prismaMock.question.findMany.mockResolvedValue(buildTypedQuestions());
  prismaMock.peerAssessment.findMany.mockResolvedValue([{ id: 77, reviewerUserId: 302, revieweeUserId: 101 }]);
  prismaMock.peerAssessment.findUnique.mockResolvedValue({ id: 77 });
  prismaMock.peerFeedback.findMany.mockResolvedValue([{ peerAssessmentId: 77 }]);
  prismaMock.staffTeamMarking.findUnique.mockResolvedValue({ id: 1 });
  prismaMock.staffStudentMarking.findMany.mockResolvedValue([{ studentUserId: 101 }]);
  prismaMock.meeting.findFirst.mockResolvedValue({ id: 600 });
  prismaMock.meeting.findUnique.mockResolvedValue({ id: 600 });
  prismaMock.meetingMinutes.findUnique.mockResolvedValue({ id: 700 });
  prismaMock.meetingAttendance.findUnique.mockResolvedValue({ meetingId: 600 });
}

function buildTypedQuestions() {
  return [
    { id: 1, label: "Technical quality", type: "slider", order: 1, configs: { min: "bad", max: 10, step: null } },
    { id: 2, label: "Team alignment", type: "multiple-choice", order: 2, configs: { options: ["Strongly disagree", "Agree"] } },
    { id: 3, label: "Communication style", type: "text", order: 3, configs: null },
    { id: 4, label: "Fallback options", type: "multiple_choice", order: 4, configs: { options: [] } },
    { id: 5, label: "Invalid slider config", type: "slider", order: 5, configs: [] },
    { id: 6, label: "No options config", type: "multiple_choice", order: 6, configs: {} },
    { id: 7, label: "General reflection", type: "text", order: 7, configs: null },
  ];
}

function expectScenarioReusedWithoutCreates() {
  expect(prismaMock.project.create).not.toHaveBeenCalled();
  expect(prismaMock.team.update).toHaveBeenCalledTimes(1);
  expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledWith({
    data: [{ teamId: 200, userId: 102 }],
    skipDuplicates: true,
  });
  expect(prismaMock.projectDeadline.create).not.toHaveBeenCalled();
}

function expectPeerFeedbackAndAssessmentReuseBehavior() {
  expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalled();
  expect(prismaMock.peerFeedback.create.mock.calls.length).toBeGreaterThan(0);
  expect(prismaMock.peerFeedback.update).toHaveBeenCalled();
  expect(prismaMock.staffTeamMarking.create).not.toHaveBeenCalled();
  expect(prismaMock.staffStudentMarking.createMany.mock.calls.length).toBeGreaterThan(0);
}

function expectMeetingArtifactsReused() {
  expect(prismaMock.meeting.create).not.toHaveBeenCalled();
  expect(prismaMock.meetingMinutes.create).not.toHaveBeenCalled();
  expect(prismaMock.meetingAttendance.create).not.toHaveBeenCalled();
}

function arrangeFallbackEdgeCase() {
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
  prismaMock.meeting.findFirst.mockResolvedValueOnce({ id: 600 }).mockResolvedValue(null);
  prismaMock.meeting.findUnique.mockResolvedValueOnce(null).mockResolvedValue(null);
  prismaMock.meetingMinutes.findUnique.mockResolvedValue(null);
  prismaMock.meetingAttendance.findUnique.mockResolvedValue(null);
}

function makeFallbackEdgeCaseContext() {
  return makeCompletedProjectContext({
    templates: [{ id: 500, questionLabels: ["Q1"] }],
    usersByRole: {
      adminOrStaff: [{ id: 900, role: "STAFF" }],
      students: [{ id: undefined, role: "STUDENT" }, { id: 0, role: "STUDENT" }, { id: 101, role: "STUDENT" }],
    },
  });
}

function expectFallbackEdgeCaseAssessmentBehavior() {
  expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({ where: { id: 55 }, select: { id: true } });
  expect(prismaMock.peerAssessment.create).toHaveBeenCalledTimes(1);
  expect(prismaMock.peerFeedback.create).toHaveBeenCalledTimes(1);
}

function expectFallbackEdgeCaseMeetingBehavior() {
  expect(prismaMock.meeting.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organiserId: 900 }) }));
  const attendancePayloads = prismaMock.meetingAttendance.create.mock.calls.map((call) => call[0]?.data);
  expect(attendancePayloads.every((payload: { userId: number }) => payload.userId > 0)).toBe(true);
}
