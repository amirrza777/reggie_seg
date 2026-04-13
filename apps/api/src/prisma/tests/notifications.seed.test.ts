import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    notification: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: mockState.prisma,
}));

import { seedNotifications } from "../../../prisma/seed/steps/notifications";

describe("seedNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.prisma.notification.findFirst.mockResolvedValue(null);
    mockState.prisma.notification.createMany.mockResolvedValue({ count: 5 });
    mockState.prisma.meeting.findMany.mockResolvedValue([
      { id: 11, title: "Retro", date: new Date(Date.now() - 60_000) },
      { id: 12, title: "Planning", date: new Date(Date.now() + 60_000) },
    ]);
  });

  it("skips when teams are missing", async () => {
    await expect(
      seedNotifications({
        teams: [],
        usersByRole: { students: [{ id: 1 }, { id: 2 }], adminOrStaff: [{ id: 3 }] },
      } as never),
    ).resolves.toBeUndefined();

    expect(mockState.prisma.notification.findFirst).not.toHaveBeenCalled();
  });

  it("skips when students are insufficient", async () => {
    await expect(
      seedNotifications({
        teams: [{ id: 5, projectId: 9 }],
        usersByRole: { students: [{ id: 1 }], adminOrStaff: [{ id: 3 }] },
      } as never),
    ).resolves.toBeUndefined();

    expect(mockState.prisma.notification.findFirst).not.toHaveBeenCalled();
  });

  it("skips when notifications were already seeded", async () => {
    mockState.prisma.notification.findFirst.mockResolvedValue({ id: 99 });
    await expect(
      seedNotifications({
        teams: [{ id: 5, projectId: 9 }],
        usersByRole: { students: [{ id: 1 }, { id: 2 }], adminOrStaff: [{ id: 3 }] },
      } as never),
    ).resolves.toBeUndefined();

    expect(mockState.prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("falls back to legacy-safe notification types when the DB enum is outdated", async () => {
    const legacyError = new Error("Data truncated for column 'type' at row 1");
    mockState.prisma.notification.createMany
      .mockRejectedValueOnce(legacyError)
      .mockResolvedValueOnce({ count: 3 });

    const context = {
      teams: [{ id: 5, projectId: 9 }],
      usersByRole: {
        students: [{ id: 1 }, { id: 2 }],
        adminOrStaff: [{ id: 3 }],
      },
    } as never;

    await expect(seedNotifications(context)).resolves.toBeUndefined();

    expect(mockState.prisma.notification.createMany).toHaveBeenCalledTimes(2);
    expect(mockState.prisma.notification.createMany.mock.calls[1]?.[0]).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({ type: "MENTION" }),
        expect.objectContaining({ type: "LOW_ATTENDANCE" }),
      ]),
    });
  });

  it("creates only baseline student notifications when there are no meetings and no staff user", async () => {
    mockState.prisma.meeting.findMany.mockResolvedValue([]);

    await expect(
      seedNotifications({
        teams: [{ id: 5, projectId: 9 }],
        usersByRole: { students: [{ id: 1 }, { id: 2 }], adminOrStaff: [] },
      } as never),
    ).resolves.toBeUndefined();

    expect(mockState.prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(mockState.prisma.notification.createMany.mock.calls[0]?.[0]).toEqual({
      data: [
        expect.objectContaining({ userId: 1, type: "DEADLINE_OVERRIDE_GRANTED" }),
        expect.objectContaining({ userId: 1, type: "FORUM_REPLY" }),
      ],
    });
  });

  it("rethrows non-legacy createMany errors", async () => {
    const queryError = new Error("connection lost");
    mockState.prisma.notification.createMany.mockRejectedValueOnce(queryError);

    await expect(
      seedNotifications({
        teams: [{ id: 5, projectId: 9 }],
        usersByRole: {
          students: [{ id: 1 }, { id: 2 }],
          adminOrStaff: [{ id: 3 }],
        },
      } as never),
    ).rejects.toThrow("connection lost");
  });

  it("treats errors without message as non-legacy and rethrows", async () => {
    mockState.prisma.notification.createMany.mockRejectedValueOnce({ code: "BROKEN" });

    await expect(
      seedNotifications({
        teams: [{ id: 5, projectId: 9 }],
        usersByRole: {
          students: [{ id: 1 }, { id: 2 }],
          adminOrStaff: [{ id: 3 }],
        },
      } as never),
    ).rejects.toEqual(expect.objectContaining({ code: "BROKEN" }));
  });
});
