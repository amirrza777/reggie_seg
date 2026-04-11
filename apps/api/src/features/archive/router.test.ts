import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./controller.js", () => ({
  listModulesHandler: vi.fn((_req: any, res: any) => res.json({ modules: [] })),
  listProjectsHandler: vi.fn((_req: any, res: any) => res.json({ projects: [] })),
  archiveModuleHandler: vi.fn((_req: any, res: any) => res.json({ success: true })),
  unarchiveModuleHandler: vi.fn((_req: any, res: any) => res.json({ success: true })),
  archiveProjectHandler: vi.fn((_req: any, res: any) => res.json({ success: true })),
  unarchiveProjectHandler: vi.fn((_req: any, res: any) => res.json({ success: true })),
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
}));

function findRoute(stack: any[], method: string, path: string) {
  return stack.find(
    (layer: any) =>
      layer.route?.path === path &&
      layer.route.stack.some((s: any) => s.method === method),
  );
}

describe("archive router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers GET /modules", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "get", "/modules")).toBeDefined();
  });

  it("registers GET /projects", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "get", "/projects")).toBeDefined();
  });

  it("registers PATCH /modules/:id/archive", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "patch", "/modules/:id/archive")).toBeDefined();
  });

  it("registers PATCH /modules/:id/unarchive", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "patch", "/modules/:id/unarchive")).toBeDefined();
  });

  it("registers PATCH /projects/:id/archive", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "patch", "/projects/:id/archive")).toBeDefined();
  });

  it("registers PATCH /projects/:id/unarchive", async () => {
    const { default: router } = await import("./router.js");
    expect(findRoute(router.stack, "patch", "/projects/:id/unarchive")).toBeDefined();
  });

  it("calls requireAuth on every route", async () => {
    const { requireAuth } = await import("../../auth/middleware.js");
    const { default: router } = await import("./router.js");
    const allRoutes = router.stack.filter((l: any) => l.route);
    for (const route of allRoutes) {
      const middlewareHandles = route.route.stack.map((s: any) => s.handle);
      expect(middlewareHandles).toContain(requireAuth);
    }
  });
});
