import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import {
  getStaffProjectNavFlagsConfig,
  updateStaffProjectNavFlagsConfig,
} from "./repo.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("projects/nav-flags repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when actor user cannot be found", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    await expect(getStaffProjectNavFlagsConfig(999, 3)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User not found",
    });
  });

  it("rejects when actor role is not staff/admin", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "STUDENT",
      enterpriseId: "ent-1",
    });

    await expect(getStaffProjectNavFlagsConfig(7, 3)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("getStaffProjectNavFlagsConfig returns config for admin in same enterprise", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 3 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      id: 3,
      name: "Project 3",
      projectNavFlags: { version: 1 },
    });

    const result = await getStaffProjectNavFlagsConfig(7, 3);
    expect(result).toEqual({
      id: 3,
      name: "Project 3",
      projectNavFlags: { version: 1 },
    });
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 3,
          module: { enterpriseId: "ent-1" },
        },
      }),
    );
  });

  it("getStaffProjectNavFlagsConfig rejects forbidden for non-lead staff", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 11,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce(null);

    await expect(getStaffProjectNavFlagsConfig(11, 3)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("getStaffProjectNavFlagsConfig rejects project-not-found when project is outside scope", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce(null);

    await expect(getStaffProjectNavFlagsConfig(7, 99)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
  });

  it("updateStaffProjectNavFlagsConfig persists payload with scoped project id", async () => {
    const navFlags = { version: 1, active: { team: true } };
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 21,
        role: "STAFF",
        enterpriseId: "ent-1",
      })
      .mockResolvedValueOnce({
        id: 21,
        role: "STAFF",
        enterpriseId: "ent-1",
      });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      archivedAt: null,
      module: { archivedAt: null },
    });
    (prisma.project.update as any).mockResolvedValueOnce({
      id: 3,
      name: "Project 3",
      projectNavFlags: navFlags,
    });

    const result = await updateStaffProjectNavFlagsConfig(21, 3, navFlags);
    expect(result).toEqual({
      id: 3,
      name: "Project 3",
      projectNavFlags: navFlags,
    });
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: { projectNavFlags: navFlags },
      }),
    );
  });

  it("updateStaffProjectNavFlagsConfig rejects admin users who are not project/module leads", async () => {
    const navFlags = { version: 1, active: { team: true } };
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 99,
        role: "ADMIN",
        enterpriseId: "ent-1",
      })
      .mockResolvedValueOnce({
        id: 99,
        role: "ADMIN",
        enterpriseId: "ent-1",
      });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce(null);

    await expect(updateStaffProjectNavFlagsConfig(99, 3, navFlags)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only project/module leads can update project feature flags",
    });
  });
});
