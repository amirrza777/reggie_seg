import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    module: { findFirst: vi.fn(), update: vi.fn() },
    userModule: { createMany: vi.fn() },
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: mockState.prisma,
}));

import {
  findJoinActor,
  findJoinableModuleByCode,
  getAuthorizedModuleForJoinCodeMutation,
  getAuthorizedModuleJoinCode,
  insertModuleEnrollment,
  updateModuleJoinCode,
} from "./repo.js";

describe("moduleJoin repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findJoinActor queries by user id with selected fields", async () => {
    mockState.prisma.user.findUnique.mockResolvedValue({ id: 7 });
    await findJoinActor(7);
    expect(mockState.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, enterpriseId: true, role: true },
    });
  });

  it("findJoinableModuleByCode filters by enterprise/code and non-archived modules", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue({ id: 9, name: "SEGP" });
    await findJoinableModuleByCode("ent-1", "ABCD2345");
    expect(mockState.prisma.module.findFirst).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", joinCode: "ABCD2345", archivedAt: null },
      select: { id: true, name: true },
    });
  });

  it("insertModuleEnrollment returns true only when at least one row is inserted", async () => {
    mockState.prisma.userModule.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(insertModuleEnrollment("ent-1", 7, 9)).resolves.toBe(true);
    await expect(insertModuleEnrollment("ent-1", 7, 9)).resolves.toBe(false);
    expect(mockState.prisma.userModule.createMany).toHaveBeenCalledWith({
      data: [{ enterpriseId: "ent-1", userId: 7, moduleId: 9 }],
      skipDuplicates: true,
    });
  });

  it("getAuthorizedModuleJoinCode uses role split for admin vs module lead", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue({ id: 12, joinCode: "ABCD2345" });

    await getAuthorizedModuleJoinCode({ enterpriseId: "ent-1", moduleId: 12, userId: 2, role: "ENTERPRISE_ADMIN" });
    expect(mockState.prisma.module.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 12,
        enterpriseId: "ent-1",
      },
      select: { id: true, joinCode: true },
    });

    await getAuthorizedModuleJoinCode({ enterpriseId: "ent-1", moduleId: 12, userId: 2, role: "STAFF" });
    expect(mockState.prisma.module.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 12,
        enterpriseId: "ent-1",
        moduleLeads: { some: { userId: 2 } },
      },
      select: { id: true, joinCode: true },
    });
  });

  it("getAuthorizedModuleForJoinCodeMutation uses role split for admin vs module lead", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue({ id: 12, name: "SEGP", enterpriseId: "ent-1", joinCode: "ABCD2345" });

    await getAuthorizedModuleForJoinCodeMutation({ enterpriseId: "ent-1", moduleId: 12, userId: 2, role: "ADMIN" });
    expect(mockState.prisma.module.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 12,
        enterpriseId: "ent-1",
      },
      select: { id: true, name: true, enterpriseId: true, joinCode: true },
    });

    await getAuthorizedModuleForJoinCodeMutation({ enterpriseId: "ent-1", moduleId: 12, userId: 2, role: "STAFF" });
    expect(mockState.prisma.module.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 12,
        enterpriseId: "ent-1",
        moduleLeads: { some: { userId: 2 } },
      },
      select: { id: true, name: true, enterpriseId: true, joinCode: true },
    });
  });

  it("updateModuleJoinCode updates by compound key and returns lookup result including null", async () => {
    mockState.prisma.module.update.mockResolvedValue({ id: 12 });
    mockState.prisma.module.findFirst.mockResolvedValueOnce({ id: 12, name: "SEGP", enterpriseId: "ent-1", joinCode: "WXYZ6789" });

    await expect(updateModuleJoinCode(12, "ent-1", "WXYZ6789")).resolves.toEqual({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "WXYZ6789",
    });
    expect(mockState.prisma.module.update).toHaveBeenCalledWith({
      where: { id_enterpriseId: { id: 12, enterpriseId: "ent-1" } },
      data: { joinCode: "WXYZ6789" },
    });

    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    await expect(updateModuleJoinCode(12, "ent-1", "NEXTCODE")).resolves.toBeNull();
  });
});
