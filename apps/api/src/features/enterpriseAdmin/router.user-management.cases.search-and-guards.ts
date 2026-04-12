/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any */
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

  it.each([
    ["search", searchUsers, { query: {} }],
    ["create", createUser, { body: { email: "x@example.com" } }],
    ["update", updateUser, { params: { id: "1" }, body: {} }],
    ["delete", removeUser, { params: { id: "1" } }],
  ])("returns 500 for missing enterprise context (%s)", async (_label, handler, req) => {
    const res = mockRes();
    await handler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it.each([
    [
      "search parser rejects invalid pagination",
      searchUsers,
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { page: "0" } },
    ],
    [
      "create parser rejects invalid body shape",
      createUser,
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, body: [] },
    ],
    [
      "update parser rejects invalid user id",
      updateUser,
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "abc" },
        body: { role: "STAFF" },
      },
    ],
    [
      "update parser rejects invalid role payload",
      updateUser,
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "17" },
        body: { role: "NOPE" },
      },
    ],
    [
      "delete parser rejects invalid user id",
      removeUser,
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { id: "0" },
      },
    ],
  ])("%s", async (_label, handler, req) => {
    const res = mockRes();
    await handler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
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
});
