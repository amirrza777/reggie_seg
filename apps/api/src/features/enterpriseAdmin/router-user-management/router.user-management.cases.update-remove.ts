/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { beforeEach, describe, expect, it } from "vitest";
import {
  getRouteHandler,
  mockRes,
  prisma,
  setupEnterpriseAdminRouterTestDefaults,
} from "../router.test-helpers.js";

describe("enterpriseAdmin user-management routes", () => {
  const searchUsers = getRouteHandler("get", "/users/search");
  const createUser = getRouteHandler("post", "/users");
  const updateUser = getRouteHandler("patch", "/users/:id");
  const removeUser = getRouteHandler("delete", "/users/:id");

  beforeEach(() => {
    setupEnterpriseAdminRouterTestDefaults();
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
