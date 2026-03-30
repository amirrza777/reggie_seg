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

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: mockState.prisma,
}));

import { seedNotifications } from "../../prisma/seed/notifications";

describe("seedNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.prisma.notification.findFirst.mockResolvedValue(null);
    mockState.prisma.meeting.findMany.mockResolvedValue([
      { id: 11, title: "Retro", date: new Date(Date.now() - 60_000) },
      { id: 12, title: "Planning", date: new Date(Date.now() + 60_000) },
    ]);
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
    } as any;

    await expect(seedNotifications(context)).resolves.toBeUndefined();

    expect(mockState.prisma.notification.createMany).toHaveBeenCalledTimes(2);
    expect(mockState.prisma.notification.createMany.mock.calls[1]?.[0]).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({ type: "MENTION" }),
        expect.objectContaining({ type: "LOW_ATTENDANCE" }),
      ]),
    });
  });
});
