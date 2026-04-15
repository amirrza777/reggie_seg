import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    meeting: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    meetingAttendance: {
      upsert: vi.fn(),
    },
    meetingMinutes: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedScenarioPastAndUpcomingMeetings } from "../../../prisma/seed/scenarioMeetings";

describe("seedScenarioPastAndUpcomingMeetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.meeting.findFirst.mockResolvedValue(null);
    prismaMock.meeting.update.mockResolvedValue({ id: 11 });
    prismaMock.meeting.create.mockResolvedValue({ id: 11 });
    prismaMock.meetingAttendance.upsert.mockResolvedValue({});
    prismaMock.meetingMinutes.upsert.mockResolvedValue({});
  });

  it("updates existing meetings and seeds attendance/minutes only for past meetings", async () => {
    let findCount = 0;
    prismaMock.meeting.findFirst.mockImplementation(async () => ({ id: 100 + ++findCount }));

    const result = await seedScenarioPastAndUpcomingMeetings({
      teamId: 10,
      organiserId: 20,
      memberIds: [1, 2, 2, -1, 0],
      titlePrefix: "Coverage",
      previousOffsetDays: 2,
      upcomingOffsetDays: 2,
      seedPastAttendance: true,
      seedPastMinutes: true,
    });

    expect(result).toEqual({ created: 0, total: 2, attendanceRows: 2 });
    expect(prismaMock.meeting.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
    expect(prismaMock.meetingAttendance.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.meetingMinutes.upsert).toHaveBeenCalledTimes(1);
  });

  it("creates meetings and skips attendance/minutes when disabled", async () => {
    let createCount = 0;
    prismaMock.meeting.create.mockImplementation(async () => ({ id: ++createCount }));

    const result = await seedScenarioPastAndUpcomingMeetings({
      teamId: 10,
      organiserId: 20,
      memberIds: [1, 2],
      titlePrefix: "No attendance",
      seedPastAttendance: false,
      seedPastMinutes: false,
    });

    expect(result).toEqual({ created: 2, total: 2, attendanceRows: 0 });
    expect(prismaMock.meeting.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.meetingAttendance.upsert).not.toHaveBeenCalled();
    expect(prismaMock.meetingMinutes.upsert).not.toHaveBeenCalled();
  });

  it("returns zero attendance rows when no valid members are provided", async () => {
    await seedScenarioPastAndUpcomingMeetings({
      teamId: 1,
      organiserId: 2,
      memberIds: [0, -1, Number.NaN],
      titlePrefix: "Invalid members",
      previousOffsetDays: 1,
      upcomingOffsetDays: 1,
    });

    expect(prismaMock.meetingAttendance.upsert).not.toHaveBeenCalled();
  });

  it("uses empty member fallback when memberIds is omitted", async () => {
    await seedScenarioPastAndUpcomingMeetings({
      teamId: 1,
      organiserId: 2,
      titlePrefix: "No member ids",
      previousOffsetDays: 1,
      upcomingOffsetDays: 1,
      seedPastAttendance: true,
      seedPastMinutes: true,
    });

    expect(prismaMock.meetingAttendance.upsert).not.toHaveBeenCalled();
    expect(prismaMock.meetingMinutes.upsert).toHaveBeenCalledTimes(1);
  });
});
