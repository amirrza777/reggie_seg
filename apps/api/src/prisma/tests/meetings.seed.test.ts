import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, randSentenceMock } = vi.hoisted(() => ({
  prismaMock: {
    meeting: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
    },
    meetingAttendance: {
      createMany: vi.fn(),
    },
    meetingParticipant: {
      createMany: vi.fn(),
    },
    meetingMinutes: {
      createMany: vi.fn(),
    },
    meetingComment: {
      create: vi.fn(),
    },
    mention: {
      createMany: vi.fn(),
    },
  },
  randSentenceMock: vi.fn(() => "seed sentence"),
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("@ngneat/falso", () => ({
  randSentence: randSentenceMock,
}));

import { seedMeetings } from "../../prisma/seed/meetings";

describe("seedMeetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.meeting.findFirst.mockResolvedValue(null);
    let meetingId = 100;
    prismaMock.meeting.create.mockImplementation(async () => ({ id: meetingId++ }));
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { userId: 1 },
      { userId: 2 },
      { userId: 3 },
      { userId: 4 },
    ]);
    prismaMock.meetingAttendance.createMany.mockResolvedValue({ count: 1 });
    prismaMock.meetingParticipant.createMany.mockResolvedValue({ count: 1 });
    prismaMock.meetingMinutes.createMany.mockResolvedValue({ count: 1 });
    let commentId = 200;
    prismaMock.meetingComment.create.mockImplementation(async () => ({ id: commentId++ }));
    prismaMock.mention.createMany.mockResolvedValue({ count: 1 });
  });

  it("skips when no teams exist", async () => {
    await expect(seedMeetings({ teams: [], usersByRole: { students: [] } } as never)).resolves.toBeUndefined();
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
  });

  it("skips when meetings are already seeded", async () => {
    prismaMock.meeting.findFirst.mockResolvedValue({ id: 10 });
    await expect(
      seedMeetings({
        teams: [{ id: 1, projectId: 10 }],
        usersByRole: { students: [{ id: 1, firstName: "A", lastName: "B" }] },
      } as never),
    ).resolves.toBeUndefined();
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
  });

  it("skips when there are fewer than two valid named team students", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ userId: 1 }]);
    await expect(
      seedMeetings({
        teams: [{ id: 1, projectId: 10 }],
        usersByRole: {
          students: [
            { id: 1, firstName: "A", lastName: "B" },
            { id: 2, firstName: "", lastName: "Missing" },
          ],
        },
      } as never),
    ).resolves.toBeUndefined();
    expect(prismaMock.meeting.create).not.toHaveBeenCalled();
  });

  it("creates meetings, minutes, comments, and mentions", async () => {
    await expect(
      seedMeetings({
        teams: [{ id: 1, projectId: 10 }],
        usersByRole: {
          students: [
            { id: 1, firstName: "A", lastName: "One" },
            { id: 2, firstName: "B", lastName: "Two" },
            { id: 3, firstName: "C", lastName: "Three" },
            { id: 4, firstName: "D", lastName: "Four" },
          ],
        },
      } as never),
    ).resolves.toBeUndefined();

    expect(prismaMock.meeting.create).toHaveBeenCalledTimes(6);
    expect(prismaMock.meetingAttendance.createMany).toHaveBeenCalled();
    expect(prismaMock.meetingParticipant.createMany).toHaveBeenCalled();
    expect(prismaMock.meetingMinutes.createMany).toHaveBeenCalled();
    expect(prismaMock.meetingComment.create).toHaveBeenCalledTimes(7);
    expect(prismaMock.mention.createMany).toHaveBeenCalled();

    const comments = prismaMock.meetingComment.create.mock.calls.map((call) => call[0]?.data?.content);
    expect(comments.some((content: string) => content.includes(", and @"))).toBe(true);
  });

  it("formats two-name mentions and normalizes array sentence variants", async () => {
    randSentenceMock.mockReturnValue(["seed", "sentence"] as never);

    await expect(
      seedMeetings({
        teams: [{ id: 1, projectId: 10 }],
        usersByRole: {
          students: [
            { id: 1, firstName: "A", lastName: "One" },
            { id: 2, firstName: "B", lastName: "Two" },
            { id: 3, firstName: "C", lastName: "Three" },
          ],
        },
      } as never),
    ).resolves.toBeUndefined();

    const comments = prismaMock.meetingComment.create.mock.calls.map((call) => call[0]?.data?.content as string);
    expect(comments.some((content) => content.includes(" and @"))).toBe(true);
    expect(comments.some((content) => content.includes("seed sentence"))).toBe(true);
  });
});
