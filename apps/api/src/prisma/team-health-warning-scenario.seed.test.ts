import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    module: { findFirst: vi.fn() },
    project: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    teamAllocation: { deleteMany: vi.fn(), createMany: vi.fn(), findFirst: vi.fn() },
    meeting: { findMany: vi.fn(), deleteMany: vi.fn() },
    meetingComment: { findMany: vi.fn(), deleteMany: vi.fn() },
    mention: { deleteMany: vi.fn() },
    meetingAttendance: { deleteMany: vi.fn() },
    meetingParticipant: { deleteMany: vi.fn() },
    meetingMinutes: { deleteMany: vi.fn() },
    projectDeadline: { upsert: vi.fn(), findUnique: vi.fn() },
    teamDeadlineOverride: { deleteMany: vi.fn() },
    studentDeadlineOverride: { deleteMany: vi.fn() },
    question: { findMany: vi.fn() },
    peerFeedback: { deleteMany: vi.fn() },
    peerAssessment: { deleteMany: vi.fn(), create: vi.fn() },
    teamHealthMessage: { deleteMany: vi.fn(), createMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    teamWarning: { deleteMany: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: mockState.prisma,
}));

import * as scenarioActors from "../../prisma/seed/teamHealthScenario/actors";
import * as scenarioAssessments from "../../prisma/seed/teamHealthScenario/assessments";
import * as scenarioCleanup from "../../prisma/seed/teamHealthScenario/cleanup";
import * as scenarioMessages from "../../prisma/seed/teamHealthScenario/messages";
import * as scenarioSetup from "../../prisma/seed/teamHealthScenario/setup";
import * as scenarioSummary from "../../prisma/seed/teamHealthScenario/summary";
import { resetScenarioDeadlineOverrides, uniquePositiveIds } from "../../prisma/seed/scenarioUtils";
import { toDateFromNow } from "../../prisma/seed/teamHealthScenario/time";

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    enterprise: { id: "ent-1" },
    modules: [{ id: 11 }],
    templates: [{ id: 21 }],
    usersByRole: {
      students: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }],
      adminOrStaff: [{ id: 900 }],
    },
    ...overrides,
  } as never;
}

function resetDefaultMocks() {
  vi.clearAllMocks();
  mockState.prisma.module.findFirst.mockResolvedValue({ id: 11 });
  mockState.prisma.project.findFirst.mockResolvedValue(null);
  mockState.prisma.project.update.mockResolvedValue({ id: 31 });
  mockState.prisma.project.create.mockResolvedValue({ id: 31 });
  mockState.prisma.team.findUnique.mockResolvedValue(null);
  mockState.prisma.team.update.mockResolvedValue({ id: 41 });
  mockState.prisma.team.create.mockResolvedValue({ id: 41 });
  mockState.prisma.team.findFirst.mockResolvedValue({ id: 51 });
  mockState.prisma.teamAllocation.findFirst.mockResolvedValue({ userId: 101 });
  mockState.prisma.meeting.findMany.mockResolvedValue([]);
  mockState.prisma.meetingComment.findMany.mockResolvedValue([]);
  mockState.prisma.projectDeadline.findUnique.mockResolvedValue({ id: 61 });
  mockState.prisma.question.findMany.mockResolvedValue([{ label: "Q1" }, { label: "Q2" }]);
  mockState.prisma.peerAssessment.create.mockResolvedValue({ id: 71 });
  mockState.prisma.user.findUnique.mockResolvedValue({ id: 901 });
  mockState.prisma.user.findMany.mockResolvedValue([{ id: 901 }, { id: 902 }]);
}

describe("team-health-warning-scenario helpers", () => {
  beforeEach(() => {
    resetDefaultMocks();
  });

  it("covers module resolution, project/team upserts, and allocation updates", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce({ id: 88 }).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await scenarioSetup.resolveScenarioModuleId(makeContext())).toBe(88);
    expect(await scenarioSetup.resolveScenarioModuleId(makeContext({ modules: [{ id: 77 }] }))).toBe(77);
    expect(await scenarioSetup.resolveScenarioModuleId(makeContext({ modules: [] }))).toBeNull();

    mockState.prisma.project.findFirst.mockResolvedValueOnce({ id: 700 });
    await scenarioSetup.upsertScenarioProject(makeContext(), 11, 21);
    expect(mockState.prisma.project.update).toHaveBeenCalled();
    mockState.prisma.project.findFirst.mockResolvedValueOnce(null);
    await scenarioSetup.upsertScenarioProject(makeContext(), 11, 21);
    expect(mockState.prisma.project.create).toHaveBeenCalled();

    mockState.prisma.team.findUnique.mockResolvedValueOnce({ id: 701 });
    await scenarioSetup.upsertScenarioTeam(makeContext(), 31);
    expect(mockState.prisma.team.update).toHaveBeenCalled();
    mockState.prisma.team.findUnique.mockResolvedValueOnce(null);
    await scenarioSetup.upsertScenarioTeam(makeContext(), 31);
    expect(mockState.prisma.team.create).toHaveBeenCalled();

    await scenarioSetup.ensureTeamAllocations(41, [101, 102]);
    expect(mockState.prisma.teamAllocation.deleteMany).toHaveBeenCalled();
    expect(mockState.prisma.teamAllocation.createMany).toHaveBeenCalled();
  });

  it("covers meeting cleanup and deadline override reset branches", async () => {
    mockState.prisma.meeting.findMany.mockResolvedValueOnce([]);
    expect(await scenarioCleanup.clearTeamMeetings(41)).toBe(0);

    mockState.prisma.meeting.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    mockState.prisma.meetingComment.findMany.mockResolvedValueOnce([{ id: 7 }]);
    expect(await scenarioCleanup.clearTeamMeetings(41)).toBe(2);
    expect(mockState.prisma.mention.deleteMany).toHaveBeenCalled();
    expect(mockState.prisma.meeting.deleteMany).toHaveBeenCalled();

    await resetScenarioDeadlineOverrides(31, 41, [101, 102]);
    expect(mockState.prisma.studentDeadlineOverride.deleteMany).toHaveBeenCalled();

    mockState.prisma.projectDeadline.findUnique.mockResolvedValueOnce(null);
    await resetScenarioDeadlineOverrides(31, 41, [101, 102]);
    expect(mockState.prisma.teamDeadlineOverride.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("covers template label fallback and partial assessment creation rules", async () => {
    mockState.prisma.question.findMany.mockResolvedValueOnce([{ label: "Alpha" }]);
    expect(await scenarioAssessments.getTemplateQuestionLabels(21)).toEqual(["Alpha"]);
    mockState.prisma.question.findMany.mockResolvedValueOnce([]);
    expect(await scenarioAssessments.getTemplateQuestionLabels(21)).toEqual(["Overall contribution"]);

    const count = await scenarioAssessments.seedPartialPeerAssessments(31, 41, 21, [101, 102, 0 as unknown as number]);
    expect(count).toBe(1);
    expect(mockState.prisma.peerFeedback.deleteMany).toHaveBeenCalled();
    expect(mockState.prisma.peerAssessment.deleteMany).toHaveBeenCalled();
  });

  it("covers team-health message builders and existing-scenario helper branches", async () => {
    const openRows = scenarioMessages.buildOpenScenarioMessages(31, 41, 101);
    expect(openRows).toHaveLength(3);
    const resolved = scenarioMessages.buildResolvedScenarioMessage(31, 41, 101, 901);
    expect(resolved.resolved).toBe(true);
    const allRows = scenarioMessages.buildScenarioTeamHealthMessageRows(31, 41, 101, 901);
    expect(allRows).toHaveLength(4);

    await scenarioMessages.seedTeamHealthMessages(31, 41, 101, 901);
    expect(mockState.prisma.teamHealthMessage.deleteMany).toHaveBeenCalled();
    expect(mockState.prisma.teamHealthMessage.createMany).toHaveBeenCalled();

    mockState.prisma.project.findFirst.mockResolvedValueOnce(null);
    await expect(
      scenarioMessages.seedExistingSeTeamHealthMessages(makeContext(), 101, 901),
    ).resolves.toEqual({ seeded: false });

    mockState.prisma.project.findFirst.mockResolvedValueOnce({ id: 222 });
    mockState.prisma.team.findFirst.mockResolvedValueOnce(null);
    await expect(
      scenarioMessages.seedExistingSeTeamHealthMessages(makeContext(), 101, 901),
    ).resolves.toEqual({ seeded: false });

    mockState.prisma.project.findFirst.mockResolvedValueOnce({ id: 222 });
    mockState.prisma.team.findFirst.mockResolvedValueOnce({ id: 333 });
    mockState.prisma.teamAllocation.findFirst.mockResolvedValueOnce({ userId: 444 });
    await expect(
      scenarioMessages.seedExistingSeTeamHealthMessages(makeContext(), 101, 901),
    ).resolves.toEqual({ seeded: true, projectId: 222, teamId: 333 });

    mockState.prisma.project.findFirst.mockResolvedValueOnce({ id: 223 });
    mockState.prisma.team.findFirst.mockResolvedValueOnce({ id: 334 });
    mockState.prisma.teamAllocation.findFirst.mockResolvedValueOnce(null);
    await expect(
      scenarioMessages.seedExistingSeTeamHealthMessages(makeContext(), 555, 901),
    ).resolves.toEqual({ seeded: true, projectId: 223, teamId: 334 });
  });

  it("covers actor/member resolution and validation helpers", async () => {
    const actors = await scenarioActors.resolveScenarioActors(makeContext());
    expect(actors.requesterId).toBe(101);
    expect(actors.reviewerId).toBe(901);

    mockState.prisma.user.findUnique.mockResolvedValueOnce(null);
    mockState.prisma.user.findMany.mockResolvedValueOnce([]);
    const fallbackActors = await scenarioActors.resolveScenarioActors(
      makeContext({ usersByRole: { students: [{ id: 8 }], adminOrStaff: [{ id: 77 }] } }),
    );
    expect(fallbackActors.requesterId).toBe(8);
    expect(fallbackActors.reviewerId).toBe(77);

    mockState.prisma.user.findUnique.mockResolvedValueOnce({ id: 9001 });
    mockState.prisma.user.findMany.mockResolvedValueOnce([]);
    const devAdminActors = await scenarioActors.resolveScenarioActors(
      makeContext({ usersByRole: { students: [], adminOrStaff: [] } }),
    );
    expect(devAdminActors.requesterId).toBe(9001);
    expect(devAdminActors.reviewerId).toBe(9001);

    mockState.prisma.user.findUnique.mockResolvedValueOnce(null);
    mockState.prisma.user.findMany.mockResolvedValueOnce([{ id: 8001 }]);
    const enterpriseAdminActors = await scenarioActors.resolveScenarioActors(
      makeContext({ usersByRole: { students: [], adminOrStaff: [] } }),
    );
    expect(enterpriseAdminActors.requesterId).toBe(8001);
    expect(enterpriseAdminActors.reviewerId).toBe(8001);

    mockState.prisma.user.findUnique.mockResolvedValueOnce(null);
    mockState.prisma.user.findMany.mockResolvedValueOnce([]);
    const sparseStudents = [{ id: 1 }, undefined as unknown as { id: number }, { id: 3 }, { id: 4 }, { id: 5 }];
    const sparseActors = await scenarioActors.resolveScenarioActors(
      makeContext({ usersByRole: { students: sparseStudents, adminOrStaff: [] } }),
    );
    expect(sparseActors.requesterId).toBe(1);

    const ids = scenarioActors.buildScenarioMemberIds(makeContext(), 101, 901);
    expect(ids).toEqual(expect.arrayContaining([101, 901]));
    const idsWithoutReviewer = scenarioActors.buildScenarioMemberIds(makeContext(), 101, null);
    expect(idsWithoutReviewer).not.toContain(901);
    expect(uniquePositiveIds([1, 2, 2, -1, 0])).toEqual([1, 2]);

    expect(scenarioActors.validateScenarioPrerequisites(null, 21, 101, [101, 102]).ok).toBe(false);
    expect(scenarioActors.validateScenarioPrerequisites(11, null, 101, [101, 102]).ok).toBe(false);
    expect(scenarioActors.validateScenarioPrerequisites(11, 21, null, [101, 102]).ok).toBe(false);
    expect(scenarioActors.validateScenarioPrerequisites(11, 21, 101, [101]).ok).toBe(false);
    expect(scenarioActors.validateScenarioPrerequisites(11, 21, 101, [101, 102]).ok).toBe(true);
    expect(toDateFromNow(1).getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(scenarioSummary.buildTeamHealthScenarioDetails(31, 41, 2, 1, 0, { seeded: false })).toContain(
      "project=31",
    );
  });
});
