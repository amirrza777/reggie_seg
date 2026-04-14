import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findUserRoleById,
  findArchiveActor,
  listModulesForArchiveActor,
  listProjectsForArchiveActor,
  findModuleIdForArchiveActorIfScoped,
  findProjectIdForArchiveActorIfScoped,
  setModuleArchived,
  setProjectArchived,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    module: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../projects/repo/repo.modules.js", () => ({
  buildModuleMembershipFilterForUser: vi.fn(() => ({ enterpriseId: "ent-1" })),
}));

import { prisma } from "../../shared/db.js";
import { buildModuleMembershipFilterForUser } from "../projects/repo/repo.modules.js";

const actor = { id: 9, role: "STAFF", enterpriseId: "ent-1", active: true };

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

  it("findArchiveActor selects id, role, enterpriseId, active", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(actor);
    const result = await findArchiveActor(9);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 9 },
      select: { id: true, role: true, enterpriseId: true, active: true },
    });
    expect(result).toEqual(actor);
  });

  it("listModulesForArchiveActor uses membership filter and list select", async () => {
    (prisma.module.findMany as any).mockResolvedValue([]);
    await listModulesForArchiveActor(actor);
    expect(buildModuleMembershipFilterForUser).toHaveBeenCalledWith(
      { id: 9, role: "STAFF", enterpriseId: "ent-1" },
      false,
    );
    expect(prisma.module.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1" },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        _count: { select: { projects: true } },
      },
      orderBy: { name: "asc" },
    });
  });

  it("listProjectsForArchiveActor scopes projects by module membership filter", async () => {
    (prisma.project.findMany as any).mockResolvedValue([]);
    await listProjectsForArchiveActor(actor);
    expect(buildModuleMembershipFilterForUser).toHaveBeenCalledWith(
      { id: 9, role: "STAFF", enterpriseId: "ent-1" },
      false,
    );
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { module: { enterpriseId: "ent-1" } },
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

  it("findModuleIdForArchiveActorIfScoped applies membership filter plus module id", async () => {
    (prisma.module.findFirst as any).mockResolvedValue({ id: 77 });
    const result = await findModuleIdForArchiveActorIfScoped(actor, 77);
    expect(buildModuleMembershipFilterForUser).toHaveBeenCalledWith(
      { id: 9, role: "STAFF", enterpriseId: "ent-1" },
      false,
    );
    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", id: 77 },
      select: { id: true },
    });
    expect(result).toEqual({ id: 77 });
  });

  it("findProjectIdForArchiveActorIfScoped applies scoped module filter plus project id", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: 88 });
    const result = await findProjectIdForArchiveActorIfScoped(actor, 88);
    expect(buildModuleMembershipFilterForUser).toHaveBeenCalledWith(
      { id: 9, role: "STAFF", enterpriseId: "ent-1" },
      false,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 88, module: { enterpriseId: "ent-1" } },
      select: { id: true },
    });
    expect(result).toEqual({ id: 88 });
  });
});
