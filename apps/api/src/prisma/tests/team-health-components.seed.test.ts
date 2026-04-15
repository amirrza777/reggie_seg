import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    module: { findFirst: vi.fn() },
    project: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    teamAllocation: { deleteMany: vi.fn(), createMany: vi.fn(), findFirst: vi.fn() },
    projectDeadline: { upsert: vi.fn() },
    teamHealthMessage: { deleteMany: vi.fn(), createMany: vi.fn() },
    meeting: { findMany: vi.fn(), deleteMany: vi.fn() },
    meetingComment: { findMany: vi.fn(), deleteMany: vi.fn() },
    mention: { deleteMany: vi.fn() },
    meetingAttendance: { deleteMany: vi.fn() },
    meetingParticipant: { deleteMany: vi.fn() },
    meetingMinutes: { deleteMany: vi.fn() },
    teamWarning: { deleteMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("../../../prisma/seed/scenarioUtils", () => ({
  resetScenarioDeadlineOverrides: vi.fn().mockResolvedValue(undefined),
  uniquePositiveIds: (ids: Array<number | null | undefined>) =>
    Array.from(new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0))),
}));

import { resolveScenarioActors } from "../../../prisma/seed/teamHealthScenario/actors";
import { clearTeamMeetings } from "../../../prisma/seed/teamHealthScenario/cleanup";
import { seedExistingSeTeamHealthMessages } from "../../../prisma/seed/teamHealthScenario/messages";
import {
  ensureTeamAllocations,
  resolveScenarioModuleId,
  upsertScenarioProject,
  upsertScenarioTeam,
} from "../../../prisma/seed/teamHealthScenario/setup";
import { makeSeedContext } from "../test-helpers/seed-context";

describe("teamHealth scenario components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.module.findFirst.mockResolvedValue(null);
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.update.mockResolvedValue({ id: 31 });
    prismaMock.project.create.mockResolvedValue({ id: 31 });
    prismaMock.team.findUnique.mockResolvedValue(null);
    prismaMock.team.update.mockResolvedValue({ id: 41 });
    prismaMock.team.create.mockResolvedValue({ id: 41 });
    prismaMock.team.findFirst.mockResolvedValue(null);
    prismaMock.teamAllocation.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.teamAllocation.findFirst.mockResolvedValue(null);
    prismaMock.projectDeadline.upsert.mockResolvedValue({});
    prismaMock.teamHealthMessage.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.teamHealthMessage.createMany.mockResolvedValue({ count: 0 });
    prismaMock.meeting.findMany.mockResolvedValue([]);
    prismaMock.meetingComment.findMany.mockResolvedValue([]);
    prismaMock.mention.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.meetingAttendance.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.meetingParticipant.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.meetingMinutes.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.meetingComment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.meeting.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.teamWarning.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it("covers module resolution and project/team upsert branches", async () => {
    const context = makeSeedContext({
      enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
      modules: [{ id: 11 }],
    });

    prismaMock.module.findFirst.mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce(null);
    expect(await resolveScenarioModuleId(context)).toBe(99);
    expect(await resolveScenarioModuleId(context)).toBe(11);

    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 31 });
    await upsertScenarioProject(context, 11, 21);
    expect(prismaMock.project.update).toHaveBeenCalled();

    prismaMock.project.findFirst.mockResolvedValueOnce(null);
    await upsertScenarioProject(context, 11, 21);
    expect(prismaMock.project.create).toHaveBeenCalled();

    prismaMock.team.findUnique.mockResolvedValueOnce({ id: 41 });
    await upsertScenarioTeam(context, 31);
    expect(prismaMock.team.update).toHaveBeenCalled();

    prismaMock.team.findUnique.mockResolvedValueOnce(null);
    await upsertScenarioTeam(context, 31);
    expect(prismaMock.team.create).toHaveBeenCalled();
  });

  it("covers actor fallback precedence and membership sync paths", async () => {
    const context = makeSeedContext({
      users: [{ id: 777, role: "STUDENT", email: "student.assessment@example.com" }],
      usersByRole: {
        adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }],
        students: [
          { id: 101, role: "STUDENT", email: "s1@example.com" },
          { id: 102, role: "STUDENT", email: "s2@example.com" },
        ],
      },
    });

    prismaMock.user.findUnique.mockResolvedValue({ id: 501 });
    prismaMock.user.findMany.mockResolvedValue([{ id: 601 }]);
    const actors = await resolveScenarioActors(context);
    expect(actors.requesterId).toBe(777);
    expect(actors.reviewerId).toBe(501);

    await ensureTeamAllocations(41, [101, 102]);
    expect(prismaMock.teamAllocation.deleteMany).toHaveBeenCalledWith({
      where: { teamId: 41, userId: { notIn: [101, 102] } },
    });
    expect(prismaMock.teamAllocation.createMany).toHaveBeenCalled();
  });

  it("covers actor fallback to enterprise admin and staff reviewer", async () => {
    const context = makeSeedContext({
      users: [],
      usersByRole: {
        adminOrStaff: [{ id: 901, role: "STAFF", email: "staff@example.com" }],
        students: [],
      },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findMany.mockResolvedValue([{ id: 777 }]);
    const actors = await resolveScenarioActors(context);
    expect(actors.requesterId).toBe(777);
    expect(actors.reviewerId).toBe(777);
  });

  it("covers actor fallback to dev admin reviewer", async () => {
    const context = makeSeedContext({
      enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
      users: [],
      usersByRole: { adminOrStaff: [], students: [] },
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 888 });
    prismaMock.user.findMany.mockResolvedValue([]);

    const actors = await resolveScenarioActors(context);
    expect(actors.requesterId).toBe(888);
    expect(actors.reviewerId).toBe(888);
  });

  it("covers existing scenario message seeding branches and cleanup no-op", async () => {
    const context = makeSeedContext({ enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" } });

    prismaMock.project.findFirst.mockResolvedValueOnce(null);
    await expect(seedExistingSeTeamHealthMessages(context, 101, 901)).resolves.toEqual({ seeded: false });

    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 55 });
    prismaMock.team.findFirst.mockResolvedValueOnce(null);
    await expect(seedExistingSeTeamHealthMessages(context, 101, 901)).resolves.toEqual({ seeded: false });

    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 56 });
    prismaMock.team.findFirst.mockResolvedValueOnce({ id: 66 });
    prismaMock.teamAllocation.findFirst.mockResolvedValueOnce(null);
    await expect(seedExistingSeTeamHealthMessages(context, 101, 901)).resolves.toEqual({
      seeded: true,
      projectId: 56,
      teamId: 66,
    });

    await expect(clearTeamMeetings(66)).resolves.toBe(0);
    expect(prismaMock.meeting.deleteMany).not.toHaveBeenCalled();
  });
});
