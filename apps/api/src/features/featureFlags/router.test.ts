import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "./router.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("featureFlags router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
  });

  it("registers GET / route", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(expect.arrayContaining([{ path: "/", methods: { get: true } }]));
  });

  it("returns flags for the authenticated user's enterprise", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-1", active: true });
    (prisma.featureFlag.findMany as any).mockResolvedValue([
      { id: 1, key: "alpha", enabled: true, enterpriseId: "ent-1" },
      { id: 2, key: "beta", enabled: false, enterpriseId: "ent-1" },
    ]);

    const layer = router.stack.find((entry: any) => entry.route?.path === "/" && entry.route?.methods?.get);
    const handler = layer.route.stack[0].handle;
    const res = { json: vi.fn() } as any;

    await handler({ user: { sub: 12 } } as any, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: { enterpriseId: true, active: true },
    });
    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1" },
      orderBy: { key: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith([
      { id: 1, key: "alpha", enabled: true, enterpriseId: "ent-1" },
      { id: 2, key: "beta", enabled: false, enterpriseId: "ent-1" },
    ]);
  });

  it("returns 401 when not authenticated", async () => {
    const layer = router.stack.find((entry: any) => entry.route?.path === "/" && entry.route?.methods?.get);
    const handler = layer.route.stack[0].handle;
    const res = { status: vi.fn(), json: vi.fn() } as any;
    res.status.mockReturnValue(res);

    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
