import { beforeEach, describe, expect, it } from "vitest";
import {
  getRouteHandler,
  mockRes,
  prisma,
  setupEnterpriseAdminRouterTestDefaults,
} from "./router.test-helpers.js";

describe("enterpriseAdmin user-management routes", () => {
  const searchUsers = getRouteHandler("get", "/users/search");
  const createUser = getRouteHandler("post", "/users");
  const updateUser = getRouteHandler("patch", "/users/:id");
  const removeUser = getRouteHandler("delete", "/users/:id");

  beforeEach(() => {
    setupEnterpriseAdminRouterTestDefaults();
  });

  it("forbids non enterprise-admin roles from searching enterprise users", async () => {
    const res = mockRes();
    await searchUsers(
      { enterpriseUser: { id: 22, enterpriseId: "ent-1", role: "STAFF" }, query: {} } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns paginated enterprise users for enterprise admin", async () => {
    (prisma.user.count as any).mockResolvedValueOnce(1);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 17,
        email: "student@example.com",
        firstName: "Stu",
        lastName: "Dent",
        role: "STUDENT",
        active: true,
      },
    ]);

    const res = mockRes();
    await searchUsers(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        query: { q: "student", page: "1", pageSize: "10" },
      } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        items: [expect.objectContaining({ id: 17, role: "STUDENT", isStaff: false })],
      }),
    );
  });

  it("keeps enterprise-removed users in search results as reinstatable removed accounts", async () => {
    (prisma.user.count as any).mockResolvedValueOnce(1);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 52,
        email: "removed@example.com",
        firstName: "Re",
        lastName: "Moved",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
      },
    ]);

    const res = mockRes();
    await searchUsers(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        query: {},
      } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ id: 52, active: false, membershipStatus: "left", role: "STUDENT", isStaff: false })],
      }),
    );
  });

  it("applies join-date sorting when requested", async () => {
    (prisma.user.count as any).mockResolvedValueOnce(1);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 22,
        email: "sorted@example.com",
        firstName: "Sort",
        lastName: "Target",
        role: "STUDENT",
        active: true,
      },
    ]);

    const res = mockRes();
    await searchUsers(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        query: { sortBy: "joinDate", sortDirection: "desc" },
      } as any,
      res,
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("creates a new enterprise user account with requested role", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([]);
    (prisma.user.create as any).mockResolvedValueOnce({
      id: 301,
      email: "new.staff@example.com",
      firstName: "New",
      lastName: "Staff",
      role: "STAFF",
      active: true,
    });

    const res = mockRes();
    await createUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { email: "new.staff@example.com", firstName: "New", lastName: "Staff", role: "STAFF" },
      } as any,
      res,
    );

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        enterpriseId: "ent-1",
        email: "new.staff@example.com",
        role: "STAFF",
      }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 301, role: "STAFF", isStaff: true }));
  });

  it("reinstates a removed user by email during account creation", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 52,
        email: "removed@example.com",
        firstName: "Re",
        lastName: "Moved",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
    ]);
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STAFF",
      active: true,
    });

    const res = mockRes();
    await createUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { email: "removed@example.com", role: "STAFF" },
      } as any,
      res,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 52 },
      data: expect.objectContaining({
        enterpriseId: "ent-1",
        blockedEnterpriseId: null,
        role: "STAFF",
        active: true,
      }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 52, role: "STAFF", isStaff: true }));
  });

  it("rejects create-by-email attempts for enterprise admin accounts", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 61,
      email: "enterprise.admin@example.com",
      firstName: "Enter",
      lastName: "Prize",
      role: "ENTERPRISE_ADMIN",
      active: false,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });

    const res = mockRes();
    await createUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { email: "enterprise.admin@example.com", role: "STAFF" },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Enterprise admin permissions are managed by invite flow" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns conflict when creating with email already used in another enterprise", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 77,
        email: "conflict@example.com",
        firstName: "Con",
        lastName: "Flict",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        enterprise: { code: "ENT2" },
      },
    ]);

    const res = mockRes();
    await createUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { email: "conflict@example.com" },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "This email is already used in another enterprise" });
  });

  it("returns conflict when duplicate email accounts include both reinstatable and non-reinstatable records", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 52,
        email: "duplicate@example.com",
        firstName: "Re",
        lastName: "Moved",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
      {
        id: 78,
        email: "duplicate@example.com",
        firstName: "Else",
        lastName: "Where",
        role: "STAFF",
        active: true,
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        enterprise: { code: "ENT2" },
      },
    ]);

    const res = mockRes();
    await createUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { email: "duplicate@example.com" },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "This email is already used in another enterprise" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates a managed user's role", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 17,
      email: "student@example.com",
      firstName: "Stu",
      lastName: "Dent",
      role: "STUDENT",
      active: true,
    });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 17,
      email: "student@example.com",
      firstName: "Stu",
      lastName: "Dent",
      role: "STAFF",
      active: true,
    });

    const res = mockRes();
    await updateUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "17" },
        body: { role: "staff" },
      } as any,
      res,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 17 },
        data: { role: "STAFF" },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 17, role: "STAFF", isStaff: true }));
  });

  it("forbids enterprise admins from changing another enterprise admin account status", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 41,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const res = mockRes();
    await updateUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "41" },
        body: { active: false },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Enterprise admin accounts can only be managed by platform admins" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("allows platform admins to change enterprise admin account status", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 41,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 41,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: false,
    });

    const res = mockRes();
    await updateUser(
      {
        enterpriseUser: { id: 1, enterpriseId: "ent-1", role: "ADMIN" },
        params: { id: "41" },
        body: { active: false },
      } as any,
      res,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 41 },
        data: { active: false },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 41, role: "ENTERPRISE_ADMIN", active: false }));
  });

  it("reinstates a removed holding-account user back into enterprise access", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-unassigned",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "UNASSIGNED" },
    });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
    });

    const res = mockRes();
    await updateUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "52" },
        body: { active: true },
      } as any,
      res,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 52 },
        data: { enterpriseId: "ent-1", blockedEnterpriseId: null, active: true, role: "STUDENT" },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 52, active: true, membershipStatus: "active" }));
  });

  it("returns conflict when reinstating a left user now in another enterprise", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce(null);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-2",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "ENT-2" },
    });

    const res = mockRes();
    await updateUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "52" },
        body: { active: true },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "User is in another enterprise" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("removes a managed user from enterprise access", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STAFF",
      active: true,
    });
    (prisma.user.update as any).mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STUDENT",
      active: true,
    });

    const res = mockRes();
    await removeUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "18" },
      } as any,
      res,
    );

    expect(prisma.moduleLead.deleteMany).toHaveBeenCalledWith({
      where: { userId: 18, module: { enterpriseId: "ent-1" } },
    });
    expect(prisma.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({
      where: { userId: 18, module: { enterpriseId: "ent-1" } },
    });
    expect(prisma.userModule.deleteMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", userId: 18 },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 18, revoked: false },
      data: { revoked: true },
    });
    expect(prisma.enterprise.upsert).toHaveBeenCalledWith({
      where: { code: "UNASSIGNED" },
      update: {},
      create: { code: "UNASSIGNED", name: "Unassigned" },
      select: { id: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 18 },
        data: { enterpriseId: "ent-unassigned", blockedEnterpriseId: "ent-1", role: "STUDENT", active: true },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 18, active: true, role: "STUDENT" }));
  });

  it("prevents enterprise admin from removing themselves", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 99,
      email: "entp-admin@example.com",
      firstName: "Self",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const res = mockRes();
    await removeUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "99" },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("forbids enterprise admins from removing another enterprise admin account", async () => {
    (prisma.user.findFirst as any).mockResolvedValueOnce({
      id: 42,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const res = mockRes();
    await removeUser(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "42" },
      } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Enterprise admin accounts can only be managed by platform admins" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
