import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./controller.js", () => ({
  dismissFlagHandler: vi.fn((_req: any, res: any) => res.json({ success: true })),
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
}));

describe("teams router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers PATCH /:teamId/dismiss-flag route", async () => {
    const { default: router } = await import("./router.js");
    const route = router.stack.find(
      (layer: any) => layer.route?.path === "/:teamId/dismiss-flag",
    );
    expect(route).toBeDefined();
    expect(route.route.stack.some((s: any) => s.method === "patch")).toBe(true);
  });

  it("calls dismissFlagHandler via the route", async () => {
    const { dismissFlagHandler } = await import("./controller.js");
    const { default: router } = await import("./router.js");

    const route = router.stack.find(
      (layer: any) => layer.route?.path === "/:teamId/dismiss-flag",
    );
    const handler = route.route.stack.at(-1).handle;

    const json = vi.fn();
    await handler({ params: { teamId: "5" } } as any, { json } as any, vi.fn());

    expect(dismissFlagHandler).toHaveBeenCalled();
  });
});
