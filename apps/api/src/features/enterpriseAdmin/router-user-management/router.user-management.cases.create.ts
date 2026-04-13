/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { beforeEach, describe, expect, it } from "vitest";
import {
  getRouteHandler,
  mockRes,
  prisma,
  setupEnterpriseAdminRouterTestDefaults,
} from "../router/router.test-helpers.js";

describe("enterpriseAdmin user-management routes", () => {
  const searchUsers = getRouteHandler("get", "/users/search");
  const createUser = getRouteHandler("post", "/users");
  const updateUser = getRouteHandler("patch", "/users/:id");
  const removeUser = getRouteHandler("delete", "/users/:id");

  beforeEach(() => {
    setupEnterpriseAdminRouterTestDefaults();
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
});
