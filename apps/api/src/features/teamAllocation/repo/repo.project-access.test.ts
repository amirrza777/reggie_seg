import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: { findFirst: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import { findStaffScopedProject, findStaffScopedProjectAccess } from "./repo.project-access.js";

describe("repo.project-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([null, { enterpriseId: "ent-1", role: "STAFF", active: false }])(
    "findStaffScopedProject returns null for inactive/missing user",
    async (user) => {
      mocks.prisma.user.findUnique.mockResolvedValue(user as any);
      await expect(findStaffScopedProject(5, 9)).resolves.toBeNull();
    },
  );

  it("findStaffScopedProject omits lead/ta scope for enterprise-wide roles", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "ADMIN", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue(null);
    await findStaffScopedProject(5, 9);
    const where = mocks.prisma.project.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.module.OR).toBeUndefined();
  });

  it("findStaffScopedProject requires lead/ta scope for staff", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STAFF", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue(null);
    await findStaffScopedProject(5, 9);
    const where = mocks.prisma.project.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.module.OR).toEqual(expect.arrayContaining([expect.any(Object), expect.any(Object)]));
  });

  it("findStaffScopedProject maps returned project", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STAFF", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue({
      id: 9,
      name: "Project",
      moduleId: 3,
      archivedAt: null,
      module: { name: "Module", archivedAt: null },
    });
    await expect(findStaffScopedProject(5, 9)).resolves.toEqual({
      id: 9,
      name: "Project",
      moduleId: 3,
      moduleName: "Module",
      archivedAt: null,
      moduleArchivedAt: null,
      enterpriseId: "ent-1",
    });
  });

  it("findStaffScopedProjectAccess maps actor role and approval flags", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STUDENT", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue({
      id: 9,
      name: "Project",
      moduleId: 3,
      archivedAt: null,
      module: {
        name: "Module",
        archivedAt: null,
        moduleLeads: [{ userId: 5 }],
        moduleTeachingAssistants: [],
      },
    });
    const access = await findStaffScopedProjectAccess(5, 9);
    expect(access).toEqual(expect.objectContaining({ actorRole: "STAFF", isModuleLead: true, canApproveAllocationDrafts: true }));
  });

  it("findStaffScopedProjectAccess returns null when project is inaccessible", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ enterpriseId: "ent-1", role: "STAFF", active: true });
    mocks.prisma.project.findFirst.mockResolvedValue(null);
    await expect(findStaffScopedProjectAccess(5, 9)).resolves.toBeNull();
  });
});