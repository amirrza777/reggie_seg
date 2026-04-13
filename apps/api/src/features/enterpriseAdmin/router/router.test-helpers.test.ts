import { describe, expect, it } from "vitest";
import {
  getRouteHandler,
  getUseHandlers,
  mockRes,
  prisma,
  setupEnterpriseAdminRouterTestDefaults,
} from "./router.test-helpers.js";

describe("enterpriseAdmin router.test-helpers", () => {
  it("builds a chainable response mock", () => {
    const res = mockRes();

    const statusResult = res.status(201);
    const jsonResult = res.json({ ok: true });

    expect(statusResult).toBe(res);
    expect(jsonResult).toBe(res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns middleware handlers and route handlers", () => {
    const useHandlers = getUseHandlers();
    expect(useHandlers.length).toBeGreaterThan(0);

    const handler = getRouteHandler("get", "/overview");
    expect(typeof handler).toBe("function");

    expect(() => getRouteHandler("post", "/does-not-exist")).toThrow(
      "Missing route POST /does-not-exist",
    );
  });

  it("sets up default prisma behavior including both transaction invocation styles", async () => {
    setupEnterpriseAdminRouterTestDefaults();

    await expect(prisma.module.findUnique()).resolves.toMatchObject({ id: 7, code: "MOD-7" });
    await expect(prisma.featureFlag.update()).resolves.toMatchObject({ key: "peer_feedback", enabled: true });

    const arrayResult = await prisma.$transaction([Promise.resolve(1), Promise.resolve(2)]);
    expect(arrayResult).toEqual([1, 2]);

    const callbackResult = await prisma.$transaction(async (tx: typeof prisma) => {
      const module = await tx.module.findUnique();
      return module.id;
    });
    expect(callbackResult).toBe(7);
  });
});
