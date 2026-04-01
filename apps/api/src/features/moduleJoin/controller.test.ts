import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const mockState = vi.hoisted(() => ({
  repo: {
    findJoinActor: vi.fn(),
  },
  service: {
    joinModuleByCode: vi.fn(),
    getModuleJoinCode: vi.fn(),
    rotateModuleJoinCode: vi.fn(),
  },
}));

vi.mock("./repo.js", () => mockState.repo);
vi.mock("./service.js", () => mockState.service);

import {
  getModuleJoinCodeHandler,
  joinModuleCompatibilityHandler,
  joinModuleHandler,
  rotateModuleJoinCodeHandler,
} from "./controller.js";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("moduleJoin controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("join handler validates auth and request body", async () => {
    const unauthorized = mockRes();
    await joinModuleHandler({ body: { code: "ABCD2345" } } as any, unauthorized);
    expect(unauthorized.status).toHaveBeenCalledWith(401);

    const invalid = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: {} } as any, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    expect(invalid.json).toHaveBeenCalledWith({ code: "INVALID_REQUEST", error: "code is required" });
  });

  it("join handler maps service responses", async () => {
    (mockState.service.joinModuleByCode as any)
      .mockResolvedValueOnce({ ok: false, status: 400, code: "INVALID_CODE", error: "Invalid or unavailable module code" })
      .mockResolvedValueOnce({
        ok: true,
        value: { moduleId: 3, moduleName: "SEGP", result: "joined" },
      });

    const badRes = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);
    expect(badRes.json).toHaveBeenCalledWith({
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });

    const okRes = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({
      moduleId: 3,
      moduleName: "SEGP",
      result: "joined",
    });
  });

  it("code-read handler sets no-store and rotates code", async () => {
    (mockState.repo.findJoinActor as any).mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    (mockState.service.getModuleJoinCode as any).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "ABCD2345" },
    });
    (mockState.service.rotateModuleJoinCode as any).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "WXYZ6789" },
    });

    const getRes = mockRes();
    await getModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, getRes);
    expect(getRes.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(getRes.json).toHaveBeenCalledWith({ moduleId: 3, joinCode: "ABCD2345" });

    const rotateRes = mockRes();
    await rotateModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, rotateRes);
    expect(rotateRes.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(rotateRes.json).toHaveBeenCalledWith({ moduleId: 3, joinCode: "WXYZ6789" });
  });

  it("compatibility handler delegates to join handler behavior", async () => {
    (mockState.service.joinModuleByCode as any).mockResolvedValue({
      ok: true,
      value: { moduleId: 9, moduleName: "SEGP", result: "already_joined" },
    });

    const res = mockRes();
    await joinModuleCompatibilityHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({
      moduleId: 9,
      moduleName: "SEGP",
      result: "already_joined",
    });
  });
});
