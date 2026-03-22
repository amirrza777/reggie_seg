import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  updateMeeting,
  createParticipants,
  replaceParticipants,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
  createMentions,
  getTeamMeetingState,
  clearTeamInactivityFlag,
  getRecentAttendanceForUser,
  getModuleLeadsForTeam,
  getModuleMeetingSettingsForTeam,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    meeting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    meetingParticipant: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    meetingAttendance: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    meetingMinutes: {
      upsert: vi.fn(),
    },
    meetingComment: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    mention: {
      createMany: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    moduleLead: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../shared/db.js";

describe("meetings repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches meetings by team id with includes", async () => {
    await getMeetingsByTeamId(5);

    expect(prisma.meeting.findMany).toHaveBeenCalledWith({
      where: { teamId: 5 },
      orderBy: { date: "desc" },
      include: expect.objectContaining({
        organiser: expect.any(Object),
        participants: expect.any(Object),
        attendances: expect.any(Object),
        minutes: expect.any(Object),
        comments: expect.any(Object),
      }),
    });
  });

  it("fetches a single meeting by id with includes", async () => {
    await getMeetingById(10);

    expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: expect.objectContaining({
        organiser: expect.any(Object),
        participants: expect.any(Object),
        attendances: expect.any(Object),
        minutes: expect.any(Object),
        comments: expect.any(Object),
      }),
    });
  });

  it("creates a meeting with the given data", async () => {
    const data = {
      teamId: 1,
      organiserId: 1,
      title: "Team Meeting",
      date: new Date("2026-03-01"),
      subject: "Week 8 review",
      location: "Bush House 3.01",
    };

    await createMeeting(data);

    expect(prisma.meeting.create).toHaveBeenCalledWith({ data });
  });

  it("updates a meeting with the given fields", async () => {
    await updateMeeting(1, { title: "New Title" });

    expect(prisma.meeting.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: "New Title" },
    });
  });

  it("creates participant records for a meeting", async () => {
    await createParticipants(5, [1, 2, 3]);

    expect(prisma.meetingParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { meetingId: 5, userId: 1 },
        { meetingId: 5, userId: 2 },
        { meetingId: 5, userId: 3 },
      ],
      skipDuplicates: true,
    });
  });

  it("replaces participants by deleting existing and creating new ones in a transaction", async () => {
    await replaceParticipants(3, [1, 2]);

    expect(prisma.$transaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
    ]);
    expect(prisma.meetingParticipant.deleteMany).toHaveBeenCalledWith({ where: { meetingId: 3 } });
    expect(prisma.meetingParticipant.createMany).toHaveBeenCalledWith({
      data: [{ meetingId: 3, userId: 1 }, { meetingId: 3, userId: 2 }],
    });
  });

  it("deletes a meeting by id", async () => {
    await deleteMeeting(7);

    expect(prisma.meeting.delete).toHaveBeenCalledWith({
      where: { id: 7 },
    });
  });

  it("bulk upserts attendance records in a transaction", async () => {
    const records = [
      { userId: 1, status: "Present" },
      { userId: 2, status: "Absent" },
    ];

    await bulkUpsertAttendance(3, records);

    expect(prisma.meetingAttendance.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("upserts minutes for a meeting", async () => {
    await upsertMinutes(5, 1, "some notes");

    expect(prisma.meetingMinutes.upsert).toHaveBeenCalledWith({
      where: { meetingId: 5 },
      create: { meetingId: 5, writerId: 1, content: "some notes" },
      update: { content: "some notes" },
    });
  });

  it("creates a comment", async () => {
    await createComment(5, 1, "looks good");

    expect(prisma.meetingComment.create).toHaveBeenCalledWith({
      data: { meetingId: 5, userId: 1, content: "looks good" },
    });
  });

  it("deletes a comment by id", async () => {
    await deleteComment(12);

    expect(prisma.meetingComment.delete).toHaveBeenCalledWith({
      where: { id: 12 },
    });
  });

  it("creates mention records for a comment", async () => {
    await createMentions(7, [2, 3]);

    expect(prisma.mention.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 2, sourceType: "COMMENT", sourceId: 7 },
        { userId: 3, sourceType: "COMMENT", sourceId: 7 },
      ],
      skipDuplicates: true,
    });
  });

  it("returns team meeting state fields", async () => {
    await getTeamMeetingState(1);

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { archivedAt: true, inactivityFlag: true },
    });
  });

  it("clears team inactivity flag", async () => {
    await clearTeamInactivityFlag(1);

    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { inactivityFlag: "NONE" },
    });
  });

  it("fetches recent attendance for a user scoped to team", async () => {
    await getRecentAttendanceForUser(1, 2, 3);

    expect(prisma.meetingAttendance.findMany).toHaveBeenCalledWith({
      where: { userId: 1, meeting: { teamId: 2 } },
      orderBy: { meeting: { date: "desc" } },
      take: 3,
      select: { status: true },
    });
  });

  it("returns empty array from getModuleLeadsForTeam when no project found", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);

    const result = await getModuleLeadsForTeam(1);

    expect(result).toEqual([]);
  });

  it("returns module leads when project found", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ moduleId: 2 });
    (prisma.moduleLead.findMany as any).mockResolvedValue([{ userId: 5 }]);

    await getModuleLeadsForTeam(1);

    expect(prisma.moduleLead.findMany).toHaveBeenCalledWith({
      where: { moduleId: 2 },
      select: { userId: true },
    });
  });

  it("returns module meeting settings when project found", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({
      module: { absenceThreshold: 4, minutesEditWindowDays: 14 },
    });

    const result = await getModuleMeetingSettingsForTeam(1);

    expect(result).toEqual({ absenceThreshold: 4, minutesEditWindowDays: 14 });
  });

  it("returns default meeting settings when no project found", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);

    const result = await getModuleMeetingSettingsForTeam(1);

    expect(result).toEqual({ absenceThreshold: 3, minutesEditWindowDays: 7 });
  });
});
