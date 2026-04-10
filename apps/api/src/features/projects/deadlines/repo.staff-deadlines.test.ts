import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import {
  clearStaffStudentDeadlineOverride,
  getStaffStudentDeadlineOverrides,
  upsertStaffStudentDeadlineOverride,
} from "./repo.staff-deadlines.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";
import { getScopedStaffUser, isAdminScopedRole } from "../repo.staff-scope.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
    teamAllocation: {
      findFirst: vi.fn(),
    },
    studentDeadlineOverride: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByProjectId: vi.fn(),
}));

vi.mock("../repo.staff-scope.js", () => ({
  getScopedStaffUser: vi.fn(),
  isAdminScopedRole: vi.fn(),
}));

describe("projects deadline override repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertProjectMutableForWritesByProjectId as any).mockResolvedValue(undefined);
    (getScopedStaffUser as any).mockResolvedValue({
      id: 11,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (isAdminScopedRole as any).mockImplementation((role: string) => role === "ADMIN" || role === "ENTERPRISE_ADMIN");
  });

  it("rejects when actor is missing or project is not in scope", async () => {
    (getScopedStaffUser as any).mockResolvedValueOnce(null);
    await expect(getStaffStudentDeadlineOverrides(11, 22)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User not found",
    });

    (prisma.project.findFirst as any).mockResolvedValueOnce(null);
    await expect(getStaffStudentDeadlineOverrides(11, 22)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
  });

  it("rejects staff users without project-level staff access", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce(null);

    await expect(getStaffStudentDeadlineOverrides(11, 22)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have staff access to this project",
    });
  });

  it("returns [] when project has no deadline configured", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: null })
      .mockResolvedValueOnce({ id: 22 });

    await expect(getStaffStudentDeadlineOverrides(11, 22)).resolves.toEqual([]);
    expect(prisma.studentDeadlineOverride.findMany).not.toHaveBeenCalled();
  });

  it("serializes staff student deadline overrides", async () => {
    const updatedAt = new Date("2026-01-20T10:00:00.000Z");
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (prisma.studentDeadlineOverride.findMany as any).mockResolvedValueOnce([
      {
        id: 3,
        userId: 55,
        taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
        taskDueDate: null,
        assessmentOpenDate: new Date("2026-01-02T09:00:00.000Z"),
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: new Date("2026-01-05T09:00:00.000Z"),
        reason: "Extension",
        updatedAt,
      },
    ]);

    await expect(getStaffStudentDeadlineOverrides(11, 22)).resolves.toEqual([
      {
        id: 3,
        userId: 55,
        taskOpenDate: "2026-01-01T09:00:00.000Z",
        taskDueDate: null,
        assessmentOpenDate: "2026-01-02T09:00:00.000Z",
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: "2026-01-05T09:00:00.000Z",
        reason: "Extension",
        updatedAt: updatedAt.toISOString(),
      },
    ]);

    expect(prisma.studentDeadlineOverride.findMany).toHaveBeenCalledWith({
      where: { projectDeadlineId: 91 },
      select: expect.any(Object),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  });

  it("bypasses staff access check for admin scoped roles", async () => {
    (getScopedStaffUser as any).mockResolvedValueOnce({
      id: 11,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (isAdminScopedRole as any).mockReturnValueOnce(true);
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 22, deadline: { id: 91 } });
    (prisma.studentDeadlineOverride.findMany as any).mockResolvedValueOnce([]);

    await expect(getStaffStudentDeadlineOverrides(11, 22)).resolves.toEqual([]);
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(1);
  });

  it("upserts student override with all fields and explicit reason", async () => {
    const payload = {
      taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
      taskDueDate: new Date("2026-01-02T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-01-03T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-01-04T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-01-05T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-01-06T09:00:00.000Z"),
      reason: "Manual extension",
    };

    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce({ userId: 55 });
    (prisma.studentDeadlineOverride.upsert as any).mockResolvedValueOnce({
      id: 7,
      userId: 55,
      ...payload,
      updatedAt: new Date("2026-01-20T10:00:00.000Z"),
    });

    const result = await upsertStaffStudentDeadlineOverride(11, 22, 55, payload);
    expect(result).toEqual({
      id: 7,
      userId: 55,
      taskOpenDate: "2026-01-01T09:00:00.000Z",
      taskDueDate: "2026-01-02T09:00:00.000Z",
      assessmentOpenDate: "2026-01-03T09:00:00.000Z",
      assessmentDueDate: "2026-01-04T09:00:00.000Z",
      feedbackOpenDate: "2026-01-05T09:00:00.000Z",
      feedbackDueDate: "2026-01-06T09:00:00.000Z",
      reason: "Manual extension",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });

    expect(prisma.studentDeadlineOverride.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_projectDeadlineId: {
            userId: 55,
            projectDeadlineId: 91,
          },
        },
        update: {
          taskOpenDate: payload.taskOpenDate,
          taskDueDate: payload.taskDueDate,
          assessmentOpenDate: payload.assessmentOpenDate,
          assessmentDueDate: payload.assessmentDueDate,
          feedbackOpenDate: payload.feedbackOpenDate,
          feedbackDueDate: payload.feedbackDueDate,
          reason: "Manual extension",
          createdByUserId: 11,
        },
        create: {
          userId: 55,
          projectDeadlineId: 91,
          createdByUserId: 11,
          taskOpenDate: payload.taskOpenDate,
          taskDueDate: payload.taskDueDate,
          assessmentOpenDate: payload.assessmentOpenDate,
          assessmentDueDate: payload.assessmentDueDate,
          feedbackOpenDate: payload.feedbackOpenDate,
          feedbackDueDate: payload.feedbackDueDate,
          reason: "Manual extension",
        },
      }),
    );
  });

  it("upserts student override with empty payload and null defaults", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce({ userId: 55 });
    (prisma.studentDeadlineOverride.upsert as any).mockResolvedValueOnce({
      id: 8,
      userId: 55,
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      reason: null,
      updatedAt: new Date("2026-01-22T10:00:00.000Z"),
    });

    await upsertStaffStudentDeadlineOverride(11, 22, 55, {});
    expect(prisma.studentDeadlineOverride.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { reason: null, createdByUserId: 11 },
        create: {
          userId: 55,
          projectDeadlineId: 91,
          createdByUserId: 11,
          taskOpenDate: null,
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          reason: null,
        },
      }),
    );
  });

  it("rejects upsert when project has no deadline or student is not allocated", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: null })
      .mockResolvedValueOnce({ id: 22 });
    await expect(upsertStaffStudentDeadlineOverride(11, 22, 55, {})).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });

    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(null);
    await expect(upsertStaffStudentDeadlineOverride(11, 22, 55, {})).rejects.toMatchObject({
      code: "STUDENT_NOT_IN_PROJECT",
    });
  });

  it("propagates mutable-project guard errors", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (assertProjectMutableForWritesByProjectId as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });

    await expect(upsertStaffStudentDeadlineOverride(11, 22, 55, {})).rejects.toMatchObject({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("clears student deadline override", async () => {
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 22, deadline: { id: 91 } })
      .mockResolvedValueOnce({ id: 22 });
    (prisma.studentDeadlineOverride.deleteMany as any).mockResolvedValueOnce({ count: 1 });

    await expect(clearStaffStudentDeadlineOverride(11, 22, 55)).resolves.toEqual({ cleared: true });
    expect(prisma.studentDeadlineOverride.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 55,
        projectDeadlineId: 91,
      },
    });
  });
});
