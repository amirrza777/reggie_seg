import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findUserRoleById,
  listAllModules,
  listAllProjects,
  setModuleArchived,
  setProjectArchived,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    module: { findMany: vi.fn(), update: vi.fn() },
    project: { findMany: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../../shared/db.js";

describe("archive repo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findUserRoleById calls prisma.user.findUnique with correct args", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: "STAFF" });
    const result = await findUserRoleById(42);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      select: { role: true },
    });
    expect(result).toEqual({ role: "STAFF" });
  });

  it("listAllModules calls prisma.module.findMany with correct args", async () => {
    (prisma.module.findMany as any).mockResolvedValue([]);
    await listAllModules();
    expect(prisma.module.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        archivedAt: true,
        _count: { select: { projects: true } },
      },
      orderBy: { name: "asc" },
    });
  });

  it("listAllProjects calls prisma.project.findMany with correct args", async () => {
    (prisma.project.findMany as any).mockResolvedValue([]);
    await listAllProjects();
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        archivedAt: true,
        module: { select: { name: true, archivedAt: true } },
        _count: { select: { teams: true } },
      },
      orderBy: [{ module: { name: "asc" } }, { name: "asc" }],
    });
  });

  it("setModuleArchived calls prisma.module.update with a date", async () => {
    const date = new Date("2026-01-01");
    (prisma.module.update as any).mockResolvedValue({ id: 1 });
    await setModuleArchived(1, date);
    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { archivedAt: date },
    });
  });

  it("setModuleArchived calls prisma.module.update with null", async () => {
    (prisma.module.update as any).mockResolvedValue({ id: 1 });
    await setModuleArchived(1, null);
    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { archivedAt: null },
    });
  });

  it("setProjectArchived calls prisma.project.update with a date", async () => {
    const date = new Date("2026-01-01");
    (prisma.project.update as any).mockResolvedValue({ id: 2 });
    await setProjectArchived(2, date);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { archivedAt: date },
    });
  });

  it("setProjectArchived calls prisma.project.update with null", async () => {
    (prisma.project.update as any).mockResolvedValue({ id: 2 });
    await setProjectArchived(2, null);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { archivedAt: null },
    });
  });
});
