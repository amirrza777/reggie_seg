import { describe, expect, it, vi } from "vitest";
import { healthHandler } from "./health.js";

import { app } from "./app.js";

function getStack() {
  return ((app as any).router?.stack ?? (app as any)._router?.stack ?? []) as any[];
}

describe("app module", () => {
  it("exports app and health handler works", () => {
    const json = vi.fn();
    const res = { json } as any;

    healthHandler({} as any, res);

    expect(json).toHaveBeenCalledWith({ ok: true, message: "API is running" });
    expect(app).toBeDefined();
  });

  it("normalization middleware fixes quoted charset and always calls next", () => {
    const stack = getStack();
    expect(stack.length).toBeGreaterThan(0);

    const normalize = stack[0].handle;
    const next = vi.fn();

    const req1: any = { headers: { "content-type": 'application/json; charset="UTF-8"' } };
    normalize(req1, {} as any, next);
    expect(req1.headers["content-type"]).toBe("application/json; charset=UTF-8");

    const req2: any = { headers: { "content-type": "application/json; charset=UTF-8" } };
    normalize(req2, {} as any, next);
    expect(req2.headers["content-type"]).toBe("application/json; charset=UTF-8");

    const req3: any = { headers: {} };
    normalize(req3, {} as any, next);

    expect(next).toHaveBeenCalledTimes(3);
  });

  it("registers mounted routers and health route", () => {
    const stack = getStack();
    const hasHealthRoute = stack.some((layer) => layer.route?.path === "/health");
    const mountedRouters = stack.filter((layer) => layer.name === "router");
    expect(hasHealthRoute).toBe(true);
    expect(mountedRouters.length).toBeGreaterThan(0);
  });
});
