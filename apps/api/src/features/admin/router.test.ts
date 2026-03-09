import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "./router.js";
import { prisma } from "../../shared/db.js";
import { listAuditLogs } from "../audit/service.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    module: {
      count: vi.fn(),
    },
    team: {
      count: vi.fn(),
    },
    meeting: {
      count: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../audit/service.js", () => ({
  listAuditLogs: vi.fn(),
}));

function getRouteHandler(path: string, method: "get" | "patch" | "post" | "put" | "delete") {
  const layer = router.stack.find(
    (entry: any) => entry.route?.path === path && entry.route?.methods?.[method]
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  return layer.route.stack[0].handle;
}

describe("admin router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers expected admin endpoints", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/summary", methods: { get: true } },
        { path: "/users", methods: { get: true } },
        { path: "/users/:id/role", methods: { patch: true } },
        { path: "/users/:id", methods: { patch: true } },
        { path: "/feature-flags", methods: { get: true } },
        { path: "/feature-flags/:key", methods: { patch: true } },
        { path: "/audit-logs", methods: { get: true } },
      ])
    );
  });

  it("GET /summary returns enterprise counts", async () => {
    (prisma.user.count as any).mockResolvedValue(10);
    (prisma.module.count as any).mockResolvedValue(4);
    (prisma.team.count as any).mockResolvedValue(7);
    (prisma.meeting.count as any).mockResolvedValue(12);

    const handler = getRouteHandler("/summary", "get");
    const req: any = { adminUser: { enterpriseId: "ent-1" } };
    const res: any = { json: vi.fn() };

    await handler(req, res);

    expect(prisma.user.count).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1" } });
    expect(prisma.module.count).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1" } });
    expect(prisma.team.count).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1" } });
    expect(prisma.meeting.count).toHaveBeenCalledWith({ where: { team: { enterpriseId: "ent-1" } } });
    expect(res.json).toHaveBeenCalledWith({ users: 10, modules: 4, teams: 7, meetings: 12 });
  });

  it("PATCH /feature-flags/:key validates enabled and maps P2025", async () => {
    const handler = getRouteHandler("/feature-flags/:key", "patch");

    const badReq: any = {
      params: { key: "repos" },
      body: { enabled: "yes" },
      adminUser: { enterpriseId: "ent-1" },
    };
    const badRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await handler(badReq, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (prisma.featureFlag.update as any).mockRejectedValue({ code: "P2025" });
    const missingReq: any = {
      params: { key: "missing" },
      body: { enabled: true },
      adminUser: { enterpriseId: "ent-1" },
    };
    const missingRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await handler(missingReq, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("GET /audit-logs validates enterprise and maps service output", async () => {
    const handler = getRouteHandler("/audit-logs", "get");

    const missingReq: any = { query: {} };
    const missingRes: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handler(missingReq, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(500);

    (listAuditLogs as any).mockResolvedValue([
      {
        id: 1,
        action: "LOGIN_SUCCESS",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        ip: "127.0.0.1",
        userAgent: "test",
        user: {
          id: 10,
          email: "admin@kcl.ac.uk",
          firstName: "Admin",
          lastName: "User",
          role: "ADMIN",
        },
      },
    ]);

    const req: any = {
      adminUser: { enterpriseId: "ent-1" },
      query: { from: "2026-03-01", to: "2026-03-31", limit: "50" },
    };
    const res: any = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    await handler(req, res);

    expect(listAuditLogs).toHaveBeenCalledWith({
      enterpriseId: "ent-1",
      from: new Date("2026-03-01"),
      to: new Date("2026-03-31"),
      limit: 50,
    });
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        action: "LOGIN_SUCCESS",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        ip: "127.0.0.1",
        userAgent: "test",
        user: {
          id: 10,
          email: "admin@kcl.ac.uk",
          firstName: "Admin",
          lastName: "User",
          role: "ADMIN",
        },
      },
    ]);
  });
});
