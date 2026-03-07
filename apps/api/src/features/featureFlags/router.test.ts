import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "./router.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    enterprise: {
      upsert: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
    },
  },
}));

describe("featureFlags router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns flags for the default enterprise", async () => {
    (prisma.enterprise.upsert as any).mockResolvedValue({ id: "ent-1" });
    (prisma.featureFlag.findMany as any).mockResolvedValue([
      { id: 1, key: "alpha", enabled: true, enterpriseId: "ent-1" },
      { id: 2, key: "beta", enabled: false, enterpriseId: "ent-1" },
    ]);

    const layer = router.stack.find((entry: any) => entry.route?.path === "/" && entry.route?.methods?.get);
    const handler = layer.route.stack[0].handle;
    const res = { json: vi.fn() } as any;

    await handler({} as any, res);

    expect(prisma.enterprise.upsert).toHaveBeenCalledWith({
      where: { code: "DEFAULT" },
      update: {},
      create: { code: "DEFAULT", name: "Default Enterprise" },
      select: { id: true },
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
});
