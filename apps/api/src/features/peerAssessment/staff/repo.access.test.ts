import { beforeEach, describe, expect, it, vi } from "vitest";
import { findModulesForStaff, getModuleDetailsIfAuthorised } from "./repo.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    module: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("peerAssessment/staff repo access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 99,
      enterpriseId: "ent-1",
      role: "STAFF",
      active: true,
    });
  });

  it("getModuleDetailsIfAuthorised restricts staff users to lead/TA modules", async () => {
    await getModuleDetailsIfAuthorised(4, 99);
    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: {
        id: 4,
        enterpriseId: "ent-1",
        OR: [
          { moduleLeads: { some: { userId: 99 } } },
          { moduleTeachingAssistants: { some: { userId: 99 } } },
        ],
      },
      select: { id: true, name: true, archivedAt: true },
    });
  });

  it("getModuleDetailsIfAuthorised lets admin access any enterprise module", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 100,
      enterpriseId: "ent-1",
      role: "ADMIN",
      active: true,
    });

    await getModuleDetailsIfAuthorised(7, 100);
    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: {
        id: 7,
        enterpriseId: "ent-1",
      },
      select: { id: true, name: true, archivedAt: true },
    });
  });

  it("getModuleDetailsIfAuthorised returns null when staff scope user is missing or inactive", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(getModuleDetailsIfAuthorised(4, 99)).resolves.toBeNull();

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 99,
      enterpriseId: "ent-1",
      role: "STAFF",
      active: false,
    });
    await expect(getModuleDetailsIfAuthorised(4, 99)).resolves.toBeNull();
  });

  it("findModulesForStaff queries modules by enterprise + membership", async () => {
    await findModulesForStaff(1);
    expect(prisma.module.findMany).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-1",
        OR: [
          { moduleLeads: { some: { userId: 99 } } },
          { moduleTeachingAssistants: { some: { userId: 99 } } },
        ],
      },
      orderBy: { name: "asc" },
    });
  });

  it("findModulesForStaff returns empty list for missing/inactive staff scope and allows admin enterprise-wide access", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(findModulesForStaff(1)).resolves.toEqual([]);

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 1,
      enterpriseId: "ent-1",
      role: "STAFF",
      active: false,
    });
    await expect(findModulesForStaff(1)).resolves.toEqual([]);

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 100,
      enterpriseId: "ent-1",
      role: "ADMIN",
      active: true,
    });
    await findModulesForStaff(100);
    expect(prisma.module.findMany).toHaveBeenLastCalledWith({
      where: {
        enterpriseId: "ent-1",
      },
      orderBy: { name: "asc" },
    });
  });

  it("findModulesForStaff allows student teaching assistants with module-scoped access", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 77,
      enterpriseId: "ent-1",
      role: "STUDENT",
      active: true,
    });

    await findModulesForStaff(77);

    expect(prisma.module.findMany).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-1",
        OR: [
          { moduleLeads: { some: { userId: 77 } } },
          { moduleTeachingAssistants: { some: { userId: 77 } } },
        ],
      },
      orderBy: { name: "asc" },
    });
  });
});

