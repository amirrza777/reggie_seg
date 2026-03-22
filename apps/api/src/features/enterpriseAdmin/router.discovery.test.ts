import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction } from "express";
import {
  getRouteHandler,
  getUseHandlers,
  mockRes,
  prisma,
  setupEnterpriseAdminRouterTestDefaults,
} from "./router.test-helpers.js";

beforeEach(() => {
  setupEnterpriseAdminRouterTestDefaults();
});

describe("enterpriseAdmin router discovery", () => {
  const [requireAuth, resolveEnterpriseUser] = getUseHandlers();
  const listFeatureFlags = getRouteHandler("get", "/feature-flags");
  const patchFeatureFlag = getRouteHandler("patch", "/feature-flags/:key");
  const listModules = getRouteHandler("get", "/modules");
  const searchModules = getRouteHandler("get", "/modules/search");
  const createModule = getRouteHandler("post", "/modules");
  const searchAccessUsers = getRouteHandler("get", "/modules/access-users/search");

  it("stores enterprise user for authorised staff/admin accounts", async () => {
    const next = vi.fn() as NextFunction;
    const req: any = { headers: { "x-user-id": "99" } };
    const res = mockRes();

    requireAuth(req, res, next);
    await resolveEnterpriseUser(req, res, next);

    expect(req.enterpriseUser).toEqual({ id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
  });

  it("rejects student users in enterprise middleware", async () => {
    const next = vi.fn() as NextFunction;
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 5,
      enterpriseId: "ent-1",
      role: "STUDENT",
      active: true,
    });
    const studentReq: any = { user: { sub: 5 } };
    const studentRes = mockRes();

    await resolveEnterpriseUser(studentReq, studentRes, next);

    expect((studentRes.status as any)).toHaveBeenCalledWith(403);
  });

  it("lists enterprise feature flags with label mappings", async () => {
    (prisma.featureFlag.findMany as any).mockResolvedValueOnce([
      { key: "repos", label: "Repos", enabled: true },
      { key: "modules", label: "Modules", enabled: false },
    ]);
    const res = mockRes();

    await listFeatureFlags({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith([
      { key: "repos", label: "Repositories", enabled: true },
      { key: "modules", label: "Modules", enabled: false },
    ]);
  });

  it("rejects feature-flag patch requests with non-boolean enabled", async () => {
    const res = mockRes();

    await patchFeatureFlag(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { key: "peer_feedback" },
        body: { enabled: "yes" },
      } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("updates feature flag values", async () => {
    (prisma.featureFlag.update as any).mockResolvedValueOnce({ key: "repos", label: "Repos", enabled: false });
    const res = mockRes();

    await patchFeatureFlag(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { key: "repos" },
        body: { enabled: false },
      } as any,
      res,
    );

    expect((res.json as any)).toHaveBeenCalledWith({ key: "repos", label: "Repositories", enabled: false });
  });

  it("maps missing feature flags to 404", async () => {
    (prisma.featureFlag.update as any).mockRejectedValueOnce({ code: "P2025" });
    const res = mockRes();

    await patchFeatureFlag(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { key: "missing" },
        body: { enabled: true },
      } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("queries modules in enterprise-admin scope", async () => {
    (prisma.module.findMany as any).mockResolvedValueOnce([]);
    const res = mockRes();

    await listModules({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enterpriseId: "ent-1" },
      }),
    );
  });

  it("queries modules in staff scope with lead/ta filters", async () => {
    (prisma.module.findMany as any).mockResolvedValueOnce([]);
    const res = mockRes();

    await listModules({ enterpriseUser: { id: 44, enterpriseId: "ent-1", role: "STAFF" } } as any, res);

    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enterpriseId: "ent-1",
          OR: [
            { moduleLeads: { some: { userId: 44 } } },
            { moduleTeachingAssistants: { some: { userId: 44 } } },
          ],
        },
      }),
    );
  });

  it("maps listModules response to include canManageAccess", async () => {
    (prisma.module.findMany as any).mockResolvedValueOnce([
      {
        id: 8,
        name: "AI",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2026-03-01"),
        updatedAt: new Date("2026-03-02"),
        _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
        moduleLeads: [],
      },
    ]);
    const res = mockRes();

    await listModules({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 8, canManageAccess: true })]),
    );
  });

  it("rejects module search with invalid page", async () => {
    const res = mockRes();

    await searchModules({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { page: "0" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns paginated module search results", async () => {
    (prisma.module.count as any).mockResolvedValueOnce(2);
    (prisma.module.findMany as any).mockResolvedValueOnce([
      {
        id: 7,
        name: "Software Engineering",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2026-03-01"),
        updatedAt: new Date("2026-03-02"),
        _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
        moduleLeads: [{ userId: 99 }],
      },
    ]);
    const res = mockRes();

    await searchModules(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { q: "software", pageSize: "1" } } as any,
      res,
    );

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
        items: [expect.objectContaining({ id: 7, canManageAccess: true })],
      }),
    );
  });

  it("falls back to fuzzy module search when strict contains search has no hits", async () => {
    (prisma.module.count as any).mockResolvedValueOnce(0);
    (prisma.module.findMany as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 8, name: "Internet Systems" },
        { id: 7, name: "Software Engineering" },
      ])
      .mockResolvedValueOnce([
        {
          id: 8,
          name: "Internet Systems",
          briefText: null,
          timelineText: null,
          expectationsText: null,
          readinessNotesText: null,
          createdAt: new Date("2026-03-01"),
          updatedAt: new Date("2026-03-02"),
          _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
          moduleLeads: [{ userId: 99 }],
        },
      ]);
    const res = mockRes();

    await searchModules(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { q: "internt systms" } } as any,
      res,
    );

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        items: [expect.objectContaining({ id: 8, canManageAccess: true })],
      }),
    );
  });

  it("creates module and persists role assignments", async () => {
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 11, role: "STAFF" },
      { id: 99, role: "ENTERPRISE_ADMIN" },
      { id: 12, role: "STUDENT" },
      { id: 31, role: "STUDENT" },
    ]);
    const res = mockRes();

    await createModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: {
          name: "Data",
          leaderIds: [11],
          taIds: [12],
          studentIds: [31],
        },
      } as any,
      res,
    );

    expect(prisma.module.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        name: "Data",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
      },
      select: { id: true },
    });
    expect(prisma.moduleLead.createMany).toHaveBeenCalledWith({
      data: [
        { moduleId: 7, userId: 11 },
        { moduleId: 7, userId: 99 },
      ],
      skipDuplicates: true,
    });
    expect(prisma.moduleTeachingAssistant.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 7, userId: 12 }],
      skipDuplicates: true,
    });
    expect(prisma.userModule.createMany).toHaveBeenCalledWith({
      data: [{ enterpriseId: "ent-1", moduleId: 7, userId: 31 }],
      skipDuplicates: true,
    });
    expect((res.status as any)).toHaveBeenCalledWith(201);
  });

  it("validates access-user scope", async () => {
    const res = mockRes();

    await searchAccessUsers({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { scope: "owners" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns paginated access users", async () => {
    (prisma.user.count as any).mockResolvedValueOnce(2);
    (prisma.user.findMany as any).mockResolvedValueOnce([
      { id: 11, email: "lead@x.com", firstName: "Lead", lastName: "User", active: true },
    ]);
    const res = mockRes();

    await searchAccessUsers(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { scope: "staff", q: "lead", pageSize: "1" } } as any,
      res,
    );

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
        scope: "staff",
        items: [expect.objectContaining({ id: 11 })],
      }),
    );
  });

  it("falls back to fuzzy access-user search when strict search has no hits", async () => {
    (prisma.user.count as any).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    (prisma.user.findMany as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 11, email: "nora@x.com", firstName: "Nora", lastName: "Patel", active: true },
        { id: 12, email: "bob@x.com", firstName: "Bob", lastName: "Stone", active: true },
      ]);
    const res = mockRes();

    await searchAccessUsers(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, query: { scope: "all", q: "nra patl" } } as any,
      res,
    );

    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        items: [expect.objectContaining({ id: 11, email: "nora@x.com" })],
      }),
    );
  });
});
