import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import {
  buildAdminUserSearchOrderBy,
  buildAdminUserSearchWhere,
  getGenerateFromNameMock,
  getRouteHandler,
  getUseHandlers,
  listAuditLogs,
  matchesAdminUserSearchCandidate,
  mockRes,
  parseAdminUserSearchFilters,
  prisma,
  setupAdminRouterTestDefaults,
} from "./router.test-helpers.js";

beforeEach(() => {
  setupAdminRouterTestDefaults();
});

describe("admin router test helpers", () => {
  it("builds chainable response mocks", () => {
    const res = mockRes();
    expect(res.status(200)).toBe(res);
    expect(res.json({ ok: true })).toBe(res);
  });

  it("returns middleware and route handlers, and errors for missing routes", () => {
    const useHandlers = getUseHandlers();
    expect(useHandlers.length).toBeGreaterThan(0);
    expect(typeof useHandlers[0]).toBe("function");

    expect(typeof getRouteHandler("get", "/summary")).toBe("function");
    expect(() => getRouteHandler("get", "/does-not-exist")).toThrow("Missing route GET /does-not-exist");
  });

  it("applies default mocks for auth, prisma, search helpers and code generation", async () => {
    expect((jwt.verify as any)("token", "secret")).toEqual({ sub: 1, admin: true });

    await expect((prisma.user.findUnique as any)({ where: { id: 1 } })).resolves.toEqual(
      expect.objectContaining({ id: 1, role: "ADMIN", enterpriseId: "ent-1" }),
    );

    expect((parseAdminUserSearchFilters as any)({})).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ page: 1, pageSize: 10 }) }),
    );
    expect((buildAdminUserSearchOrderBy as any)({})).toEqual([{ id: "asc" }]);
    expect((buildAdminUserSearchWhere as any)({})).toEqual({ enterpriseId: "ent-1" });
    expect((matchesAdminUserSearchCandidate as any)({ id: 1 }, "query")).toBe(false);

    await expect((listAuditLogs as any)({ enterpriseId: "ent-1" })).resolves.toEqual([]);
    await expect(getGenerateFromNameMock()("Enterprise Name")).resolves.toBe("AUTO123");
  });
});
