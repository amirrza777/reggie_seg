import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    meeting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    meetingAttendance: {
      upsert: vi.fn(),
    },
    meetingMinutes: {
      upsert: vi.fn(),
    },
    meetingComment: {
      create: vi.fn(),
      delete: vi.fn(),
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
        attendances: expect.any(Object),
        minutes: true,
        comments: expect.any(Object),
      }),
    });
  });

  it("fetches a single meeting by id", async () => {
    await getMeetingById(10);

    expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: expect.objectContaining({
        organiser: expect.any(Object),
        attendances: expect.any(Object),
        minutes: true,
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
});
