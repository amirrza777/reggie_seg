import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction } from "express";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: prismaMock }));

import { resolveEnterpriseUser } from "./middleware.js";

function createRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("enterpriseAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth user id is missing", async () => {
    const req = {} as any;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await resolveEnterpriseUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is missing or inactive", async () => {
    const next = vi.fn() as NextFunction;

    const missingReq = { user: { sub: 5 } } as any;
    const missingRes = createRes();
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await resolveEnterpriseUser(missingReq, missingRes, next);
    expect(missingRes.status).toHaveBeenCalledWith(403);

    const inactiveReq = { user: { sub: 6 } } as any;
    const inactiveRes = createRes();
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 6,
      enterpriseId: "ent-1",
      role: "STAFF",
      active: false,
    });
    await resolveEnterpriseUser(inactiveReq, inactiveRes, next);
    expect(inactiveRes.status).toHaveBeenCalledWith(403);
  });

  it("returns 403 for student roles", async () => {
    const req = { user: { sub: 7 } } as any;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 7,
      enterpriseId: "ent-1",
      role: "STUDENT",
      active: true,
    });

    await resolveEnterpriseUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("stores enterprise user context and continues for non-student active users", async () => {
    const req = { user: { sub: 8 } } as any;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 8,
      enterpriseId: "ent-2",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    await resolveEnterpriseUser(req, res, next);

    expect(req.enterpriseUser).toEqual({
      id: 8,
      enterpriseId: "ent-2",
      role: "ENTERPRISE_ADMIN",
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
