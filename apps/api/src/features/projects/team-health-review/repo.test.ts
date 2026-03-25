import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import {
  canStaffAccessTeamInProject,
  createTeamHealthMessage,
  getTeamCurrentDeadlineInProject,
  getTeamDeadlineDetailsInProject,
  getTeamHealthMessagesForTeamInProject,
  getTeamHealthMessagesForUserInProject,
  hasAnotherResolvedTeamHealthMessage,
  resolveTeamHealthMessageWithDeadlineOverride,
  reviewTeamHealthMessage,
} from "./repo.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    teamHealthMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    teamDeadlineOverride: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("projects/team-health-review repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and lists team health messages with expected filters", async () => {
    await createTeamHealthMessage(3, 4, 7, "Need support", "Please review");
    expect(prisma.teamHealthMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId: 3,
          teamId: 4,
          requesterUserId: 7,
          subject: "Need support",
          details: "Please review",
        },
      }),
    );

    await getTeamHealthMessagesForUserInProject(3, 7);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, requesterUserId: 7 },
        orderBy: { createdAt: "desc" },
      }),
    );

    await getTeamHealthMessagesForTeamInProject(3, 4);
    expect(prisma.teamHealthMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 3, teamId: 4 },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("detects whether another resolved team health message exists", async () => {
    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce({ id: 11 });
    await expect(hasAnotherResolvedTeamHealthMessage(3, 4, 9)).resolves.toBe(true);

    (prisma.teamHealthMessage.findFirst as any).mockResolvedValueOnce(null);
    await expect(hasAnotherResolvedTeamHealthMessage(3, 4, 9)).resolves.toBe(false);
  });

  it("canStaffAccessTeamInProject returns false when user is missing and true for admin scope", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(canStaffAccessTeamInProject(7, 3, 4)).resolves.toBe(false);

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 3 });
    await expect(canStaffAccessTeamInProject(7, 3, 4)).resolves.toBe(true);
  });

  it("canStaffAccessTeamInProject applies module lead/TA restriction for non-admin staff", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 8,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 3 });

    await canStaffAccessTeamInProject(8, 3, 4);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          module: expect.objectContaining({
            OR: [
              { moduleLeads: { some: { userId: 8 } } },
              { moduleTeachingAssistants: { some: { userId: 8 } } },
            ],
          }),
        }),
      }),
    );
  });

  it("getTeamCurrentDeadlineInProject merges team override over project deadline", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
      },
    });

    const deadline = await getTeamCurrentDeadlineInProject(3, 4);
    expect(deadline).toEqual(
      expect.objectContaining({
        taskDueDate: new Date("2026-03-10T00:00:00.000Z"),
        isOverridden: true,
      }),
    );
  });

  it("getTeamCurrentDeadlineInProject returns null when team is missing or project deadline is missing", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce(null);
    await expect(getTeamCurrentDeadlineInProject(3, 4)).resolves.toBeNull();

    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: { deadline: null },
      deadlineOverride: null,
    });
    await expect(getTeamCurrentDeadlineInProject(3, 4)).resolves.toBeNull();
  });

  it("getTeamDeadlineDetailsInProject returns base/effective deadlines and parsed metadata", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        reason: JSON.stringify({
          inputMode: "SHIFT_DAYS",
          shiftDays: { taskDueDate: 2 },
        }),
      },
    });

    const details = await getTeamDeadlineDetailsInProject(3, 4);
    expect(details).toEqual(
      expect.objectContaining({
        deadlineInputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 2 },
      }),
    );
  });

  it("getTeamDeadlineDetailsInProject handles invalid metadata mode and invalid JSON", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        reason: JSON.stringify({ inputMode: "INVALID_MODE" }),
      },
    });
    const invalidModeDetails = await getTeamDeadlineDetailsInProject(3, 4);
    expect(invalidModeDetails).toEqual(expect.objectContaining({ deadlineInputMode: null, shiftDays: null }));

    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        reason: "{invalid-json",
      },
    });
    const invalidJsonDetails = await getTeamDeadlineDetailsInProject(3, 4);
    expect(invalidJsonDetails).toEqual(expect.objectContaining({ deadlineInputMode: null, shiftDays: null }));
  });

  it("getTeamDeadlineDetailsInProject handles empty and missing metadata", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        reason: JSON.stringify({ inputMode: "SHIFT_DAYS", shiftDays: { taskDueDate: -1 } }),
      },
    });
    const emptyShiftDetails = await getTeamDeadlineDetailsInProject(3, 4);
    expect(emptyShiftDetails).toEqual(expect.objectContaining({ deadlineInputMode: "SHIFT_DAYS", shiftDays: null }));

    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: {
        deadline: {
          taskOpenDate: new Date("2026-03-01T00:00:00.000Z"),
          taskDueDate: new Date("2026-03-08T00:00:00.000Z"),
          assessmentOpenDate: new Date("2026-03-09T00:00:00.000Z"),
          assessmentDueDate: new Date("2026-03-12T00:00:00.000Z"),
          feedbackOpenDate: new Date("2026-03-13T00:00:00.000Z"),
          feedbackDueDate: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
      deadlineOverride: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        reason: null,
      },
    });
    const noReasonDetails = await getTeamDeadlineDetailsInProject(3, 4);
    expect(noReasonDetails).toEqual(expect.objectContaining({ deadlineInputMode: null, shiftDays: null }));
  });

  it("getTeamDeadlineDetailsInProject returns null when project deadline is missing", async () => {
    (prisma.team.findFirst as any).mockResolvedValueOnce({
      project: { deadline: null },
      deadlineOverride: null,
    });
    await expect(getTeamDeadlineDetailsInProject(3, 4)).resolves.toBeNull();
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
