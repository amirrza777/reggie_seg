import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  prisma,
  resolveTeamHealthMessageWithDeadlineOverride,
  reviewTeamHealthMessage,
} from "./repo.test.shared.js";

describe("projects/team-health-review repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reviewTeamHealthMessage returns null when request is missing", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce(null);
    await expect(reviewTeamHealthMessage(3, 4, 11, 7, false)).resolves.toBeNull();
  });

  it("reviewTeamHealthMessage updates directly when not transitioning from resolved state", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.teamHealthMessage.update as any).mockResolvedValueOnce({ id: 11, resolved: false });

    await reviewTeamHealthMessage(3, 4, 11, 7, false);
    expect(prisma.teamHealthMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: false,
          responseText: null,
        }),
      }),
    );
  });

  it("reviewTeamHealthMessage omits responseText when resolving without explicit response text", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.teamHealthMessage.update as any).mockResolvedValueOnce({ id: 11, resolved: true });

    await reviewTeamHealthMessage(3, 4, 11, 7, true);
    const calledWith = (prisma.teamHealthMessage.update as any).mock.calls[0][0];
    expect(calledWith.data.resolved).toBe(true);
    expect(calledWith.data).not.toHaveProperty("responseText");
  });

  it("reviewTeamHealthMessage includes responseText when resolving with explicit text", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.teamHealthMessage.update as any).mockResolvedValueOnce({ id: 11, resolved: true });

    await reviewTeamHealthMessage(3, 4, 11, 7, true, "Thanks for flagging this");
    expect(prisma.teamHealthMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          resolved: true,
          responseText: "Thanks for flagging this",
        }),
      }),
    );
  });

  it("reviewTeamHealthMessage clears deadline override inside transaction when unresolving a resolved request", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11, resolved: true });

    const deleteMany = vi.fn().mockResolvedValueOnce({ count: 1 });
    const update = vi.fn().mockResolvedValueOnce({ id: 11, resolved: false });
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamDeadlineOverride: { deleteMany },
        teamHealthMessage: { update },
      }),
    );

    const result = await reviewTeamHealthMessage(3, 4, 11, 7, false);
    expect(deleteMany).toHaveBeenCalledWith({ where: { teamId: 4 } });
    expect(result).toEqual({ id: 11, resolved: false });
  });

  it("resolveTeamHealthMessageWithDeadlineOverride handles missing request/deadline and success path", async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamHealthMessage: { findFirst: vi.fn().mockResolvedValueOnce(null) },
      }),
    );
    await expect(
      resolveTeamHealthMessageWithDeadlineOverride(
        3,
        4,
        11,
        7,
        {
          taskOpenDate: null,
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
        },
        { inputMode: "SELECT_DATE" },
      ),
    ).resolves.toBeNull();

    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamHealthMessage: { findFirst: vi.fn().mockResolvedValueOnce({ id: 11 }) },
        team: { findFirst: vi.fn().mockResolvedValueOnce({ project: { deadline: null } }) },
      }),
    );
    await expect(
      resolveTeamHealthMessageWithDeadlineOverride(
        3,
        4,
        11,
        7,
        {
          taskOpenDate: null,
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
        },
      ),
    ).resolves.toBeNull();

    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamHealthMessage: {
          findFirst: vi.fn().mockResolvedValueOnce({ id: 11 }),
          update: vi.fn().mockResolvedValueOnce({ id: 11, resolved: true }),
        },
        team: {
          findFirst: vi.fn().mockResolvedValueOnce({
            project: {
              deadline: {
                id: 99,
                taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
                taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
                assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
                assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
                feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
                feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
              },
            },
          }),
        },
        teamDeadlineOverride: {
          upsert: vi.fn().mockResolvedValueOnce({
            taskOpenDate: null,
            taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
            assessmentOpenDate: null,
            assessmentDueDate: null,
            feedbackOpenDate: null,
            feedbackDueDate: null,
          }),
        },
      }),
    );

    const result = await resolveTeamHealthMessageWithDeadlineOverride(
      3,
      4,
      11,
      7,
      {
        taskOpenDate: null,
        taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
      },
      {
        inputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 2 },
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        request: { id: 11, resolved: true },
        deadline: expect.objectContaining({
          taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
          isOverridden: true,
        }),
      }),
    );
  });

  it("resolveTeamHealthMessageWithDeadlineOverride omits reason update and stores null reason when metadata has no inputMode", async () => {
    const upsert = vi.fn().mockResolvedValueOnce({
      taskOpenDate: null,
      taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
    });
    (prisma.$transaction as any).mockImplementationOnce(async (cb: any) =>
      cb({
        teamHealthMessage: {
          findFirst: vi.fn().mockResolvedValueOnce({ id: 11 }),
          update: vi.fn().mockResolvedValueOnce({ id: 11, resolved: true }),
        },
        team: {
          findFirst: vi.fn().mockResolvedValueOnce({
            project: {
              deadline: {
                id: 99,
                taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
                taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
                assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
                assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
                feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
                feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
              },
            },
          }),
        },
        teamDeadlineOverride: { upsert },
      }),
    );

    await resolveTeamHealthMessageWithDeadlineOverride(
      3,
      4,
      11,
      7,
      {
        taskOpenDate: null,
        taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
      },
      {},
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({ reason: expect.anything() }),
        create: expect.objectContaining({ reason: null }),
      }),
    );
  });
});
