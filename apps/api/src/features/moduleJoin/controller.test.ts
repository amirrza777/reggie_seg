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

    const invalidBody = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: {} } as any, invalidBody);
    expect(invalidBody.status).toHaveBeenCalledWith(400);
    expect(invalidBody.json).toHaveBeenCalledWith({ code: "INVALID_REQUEST", error: "code is required" });

    const invalidNormalized = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: { code: "bad" } } as any, invalidNormalized);
    expect(invalidNormalized.status).toHaveBeenCalledWith(400);
    expect(invalidNormalized.json).toHaveBeenCalledWith({ code: "INVALID_CODE", error: "code must be a valid module join code" });
    expect(mockState.service.joinModuleByCode).not.toHaveBeenCalled();
  });

  it("join handler maps service success and full error status range", async () => {
    (mockState.service.joinModuleByCode as any)
      .mockResolvedValueOnce({ ok: false, status: 401, code: "UNAUTHORIZED", error: "Unauthorized" })
      .mockResolvedValueOnce({ ok: false, status: 403, code: "FORBIDDEN", error: "Forbidden" })
      .mockResolvedValueOnce({ ok: false, status: 404, code: "MODULE_NOT_FOUND", error: "Module not found" })
      .mockResolvedValueOnce({ ok: false, status: 409, code: "CONFLICT", error: "Conflict" })
      .mockResolvedValueOnce({
        ok: true,
        value: { moduleId: 3, moduleName: "SEGP", result: "joined" },
      });

    for (const status of [401, 403, 404, 409]) {
      const res = mockRes();
      await joinModuleHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, res);
      expect(res.status).toHaveBeenCalledWith(status);
    }

    const okRes = mockRes();
    await joinModuleHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({
      moduleId: 3,
      moduleName: "SEGP",
      result: "joined",
    });
  });

  it("code-read handler validates module id and actor", async () => {
    const unauthorized = mockRes();
    await getModuleJoinCodeHandler({ params: { moduleId: "3" } } as any, unauthorized);
    expect(unauthorized.status).toHaveBeenCalledWith(401);

    const invalidModuleId = mockRes();
    await getModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "abc" } } as any, invalidModuleId);
    expect(invalidModuleId.status).toHaveBeenCalledWith(400);

    mockState.repo.findJoinActor.mockResolvedValue(null);
    const noActor = mockRes();
    await getModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, noActor);
    expect(noActor.status).toHaveBeenCalledWith(401);
  });

  it("code-read handler maps service errors and does not set no-store on failure", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    (mockState.service.getModuleJoinCode as any).mockResolvedValue({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });

    const res = mockRes();
    await getModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("code-read handler sets no-store on success", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    (mockState.service.getModuleJoinCode as any).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "ABCD2345" },
    });

    const getRes = mockRes();
    await getModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, getRes);
    expect(getRes.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(getRes.json).toHaveBeenCalledWith({ moduleId: 3, joinCode: "ABCD2345" });
  });

  it("rotate handler validates module id and actor", async () => {
    const unauthorized = mockRes();
    await rotateModuleJoinCodeHandler({ params: { moduleId: "3" } } as any, unauthorized);
    expect(unauthorized.status).toHaveBeenCalledWith(401);

    const invalidModuleId = mockRes();
    await rotateModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "abc" } } as any, invalidModuleId);
    expect(invalidModuleId.status).toHaveBeenCalledWith(400);

    mockState.repo.findJoinActor.mockResolvedValue(null);
    const noActor = mockRes();
    await rotateModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, noActor);
    expect(noActor.status).toHaveBeenCalledWith(401);
  });

  it("rotate handler maps service errors and does not set no-store on failure", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    (mockState.service.rotateModuleJoinCode as any).mockResolvedValue({
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Conflict",
    });

    const res = mockRes();
    await rotateModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("rotate handler sets no-store on success", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    (mockState.service.rotateModuleJoinCode as any).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "WXYZ6789" },
    });

    const rotateRes = mockRes();
    await rotateModuleJoinCodeHandler({ user: { sub: 7 }, params: { moduleId: "3" } } as any, rotateRes);
    expect(rotateRes.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(rotateRes.json).toHaveBeenCalledWith({ moduleId: 3, joinCode: "WXYZ6789" });
  });

  it("compatibility handler delegates join behavior for both success and errors", async () => {
    (mockState.service.joinModuleByCode as any)
      .mockResolvedValueOnce({
        ok: true,
        value: { moduleId: 9, moduleName: "SEGP", result: "already_joined" },
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        code: "INVALID_CODE",
        error: "Invalid or unavailable module code",
      });

    const successRes = mockRes();
    await joinModuleCompatibilityHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, successRes);
    expect(successRes.json).toHaveBeenCalledWith({
      moduleId: 9,
      moduleName: "SEGP",
      result: "already_joined",
    });

    const errorRes = mockRes();
    await joinModuleCompatibilityHandler({ user: { sub: 7 }, body: { code: "ABCD2345" } } as any, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(400);
    expect(errorRes.json).toHaveBeenCalledWith({
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });
  });
});
