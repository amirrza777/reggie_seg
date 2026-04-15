import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    meeting: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    meetingMinutes: { findUnique: vi.fn(), create: vi.fn() },
    meetingAttendance: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { ensureScenarioMeetings } from "../../../prisma/seed/completed-project/meetings";

describe("completed-project ensureScenarioMeetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.meeting.findFirst.mockResolvedValue(null);
    prismaMock.meeting.findUnique.mockResolvedValue(null);
    let meetingId = 100;
    prismaMock.meeting.create.mockImplementation(async () => ({ id: ++meetingId }));
    prismaMock.meetingMinutes.findUnique.mockResolvedValue(null);
    prismaMock.meetingMinutes.create.mockResolvedValue({ id: 1 });
    prismaMock.meetingAttendance.findUnique.mockResolvedValue(null);
    prismaMock.meetingAttendance.create.mockResolvedValue({ meetingId: 1 });
  });

  it("covers existing-meeting null fallback and falsy-member attendance skip", async () => {
    prismaMock.meeting.findFirst.mockResolvedValue({ id: 77 });
    prismaMock.meeting.findUnique.mockResolvedValue({ id: 77 });

    const counters = await ensureScenarioMeetings(11, 21, [1, 0]);
    expect(counters.createdMeetings).toBe(0);
    expect(counters.createdAttendances).toBe(4);
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
  });
});
