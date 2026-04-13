import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import { updateStaffTeamDeadlineProfile } from "./repo.team-deadline-profile.js";
import { getScopedStaffUser, isAdminScopedRole } from "../repo/repo.staff-scope.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    team: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../repo/repo.staff-scope.js", () => ({
  getScopedStaffUser: vi.fn(),
  isAdminScopedRole: vi.fn(),
}));

describe("projects team deadline profile repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAdminScopedRole as any).mockImplementation((role: string) => role === "ADMIN" || role === "ENTERPRISE_ADMIN");
  });

  it("rejects when actor is missing or not staff/admin", async () => {
    (getScopedStaffUser as any).mockResolvedValueOnce(null);
    await expect(updateStaffTeamDeadlineProfile(10, 20, "MCF")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User not found",
    });

    (getScopedStaffUser as any).mockResolvedValueOnce({
      id: 10,
      role: "STUDENT",
      enterpriseId: "ent-1",
    });
    await expect(updateStaffTeamDeadlineProfile(10, 20, "MCF")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only staff can update team deadline profile",
    });
  });

  it("rejects when team cannot be accessed by scoped actor", async () => {
    (getScopedStaffUser as any).mockResolvedValueOnce({
      id: 10,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.team.findFirst as any).mockResolvedValueOnce(null);

    await expect(updateStaffTeamDeadlineProfile(10, 20, "MCF")).rejects.toMatchObject({
      code: "TEAM_NOT_FOUND",
    });
  });

  it("updates deadline profile for admin and staff users with expected scope filters", async () => {
    (getScopedStaffUser as any)
      .mockResolvedValueOnce({
        id: 99,
        role: "ADMIN",
        enterpriseId: "ent-1",
      })
      .mockResolvedValueOnce({
        id: 10,
        role: "STAFF",
        enterpriseId: "ent-1",
      });
    (isAdminScopedRole as any)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    (prisma.team.findFirst as any)
      .mockResolvedValueOnce({ id: 20 })
      .mockResolvedValueOnce({ id: 20 });
    (prisma.team.update as any)
      .mockResolvedValueOnce({ id: 20, deadlineProfile: "MCF" })
      .mockResolvedValueOnce({ id: 20, deadlineProfile: "STANDARD" });

    await expect(updateStaffTeamDeadlineProfile(99, 20, "MCF")).resolves.toEqual({
      id: 20,
      deadlineProfile: "MCF",
    });
    expect(prisma.team.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 20,
          project: {
            module: {
              enterpriseId: "ent-1",
              archivedAt: null,
            },
          },
        }),
      }),
    );

    await expect(updateStaffTeamDeadlineProfile(10, 20, "STANDARD")).resolves.toEqual({
      id: 20,
      deadlineProfile: "STANDARD",
    });
    expect(prisma.team.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 20,
          project: {
            module: expect.objectContaining({
              enterpriseId: "ent-1",
              OR: [
                { moduleLeads: { some: { userId: 10 } } },
                { moduleTeachingAssistants: { some: { userId: 10 } } },
              ],
            }),
          },
        }),
      }),
    );
    expect(prisma.team.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 20 },
        data: { deadlineProfile: "STANDARD" },
      }),
    );
  });
});
