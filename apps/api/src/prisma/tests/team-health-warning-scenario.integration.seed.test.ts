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

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: mockState.prisma,
}));

import { seedTeamHealthWarningScenario } from "../../../prisma/seed/team-health-warning-scenario";

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

describe("seedTeamHealthWarningScenario", () => {
  beforeEach(() => {
    resetDefaultMocks();
    mockState.prisma.project.findFirst.mockResolvedValue(null);
    mockState.prisma.team.findUnique.mockResolvedValue(null);
  });

  it("skips when prerequisites are missing", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue(null);
    const value = await seedTeamHealthWarningScenario(makeContext({ modules: [], templates: [] }));
    expect(value).toBeUndefined();
    expect(mockState.prisma.project.create).not.toHaveBeenCalled();
  });

  it("runs full happy path with existing SE branch and cleanup", async () => {
    mockState.prisma.meeting.findMany.mockResolvedValue([{ id: 9 }]);
    mockState.prisma.meetingComment.findMany.mockResolvedValue([{ id: 10 }]);
    mockState.prisma.project.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 222 });
    mockState.prisma.team.findUnique.mockResolvedValueOnce(null);
    mockState.prisma.team.findFirst.mockResolvedValueOnce({ id: 333 });
    await expect(seedTeamHealthWarningScenario(makeContext())).resolves.toEqual({ projectId: 31, teamId: 41 });
    expect(mockState.prisma.project.create).toHaveBeenCalled();
    expect(mockState.prisma.team.create).toHaveBeenCalled();
    expect(mockState.prisma.projectDeadline.upsert).toHaveBeenCalled();
    expect(mockState.prisma.teamWarning.deleteMany).toHaveBeenCalled();
    expect(mockState.prisma.teamHealthMessage.createMany).toHaveBeenCalled();
  });

  it("skips when requester cannot be resolved", async () => {
    mockState.prisma.user.findUnique.mockResolvedValue(null);
    mockState.prisma.user.findMany.mockResolvedValue([]);
    const value = await seedTeamHealthWarningScenario(
      makeContext({ usersByRole: { students: [], adminOrStaff: [] } }),
    );
    expect(value).toBeUndefined();
    expect(mockState.prisma.project.create).not.toHaveBeenCalled();
  });
});
