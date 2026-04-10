import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  service: {
    joinModuleByCode: vi.fn(),
    getModuleJoinCode: vi.fn(),
    rotateModuleJoinCode: vi.fn(),
  },
}));

vi.mock("./service.js", () => mockState.service);

import {
  getModuleJoinCodeHandler,
  joinModuleHandler,
  rotateModuleJoinCodeHandler,
} from "./controller.js";
import { createMockResponse, createModuleJoinRequest } from "./test-helpers.js";

describe("moduleJoin controller", registerControllerTests);

function registerControllerTests() {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  registerJoinValidationTest();
  registerJoinServiceMappingTest();
  registerReadValidationTest();
  registerReadFailureTest();
  registerReadSuccessTest();
  registerRotateValidationTest();
  registerRotateFailureTest();
  registerRotateSuccessTest();
}

function registerJoinValidationTest() {
  it("join handler validates auth and request body", async () => {
    const unauthorized = createMockResponse();
    await joinModuleHandler(createModuleJoinRequest({ body: { code: "ABCD2345" } }), unauthorized.res);
    expect(unauthorized.statusSpy).toHaveBeenCalledWith(401);

    const invalidBody = createMockResponse();
    await joinModuleHandler(createModuleJoinRequest({ userSub: 7, body: {} }), invalidBody.res);
    expect(invalidBody.statusSpy).toHaveBeenCalledWith(400);
    expect(invalidBody.jsonSpy).toHaveBeenCalledWith({ code: "INVALID_REQUEST", error: "code is required" });

    const invalidNormalized = createMockResponse();
    await joinModuleHandler(createModuleJoinRequest({ userSub: 7, body: { code: "bad" } }), invalidNormalized.res);
    expect(invalidNormalized.statusSpy).toHaveBeenCalledWith(400);
    expect(invalidNormalized.jsonSpy).toHaveBeenCalledWith({ code: "INVALID_CODE", error: "code must be a valid module join code" });
    expect(mockState.service.joinModuleByCode).not.toHaveBeenCalled();
  });
}

function registerJoinServiceMappingTest() {
  it("join handler maps service success and full error status range", async () => {
    (mockState.service.joinModuleByCode as never)
      .mockResolvedValueOnce({ ok: false, status: 401, code: "UNAUTHORIZED", error: "Unauthorized" })
      .mockResolvedValueOnce({ ok: false, status: 403, code: "FORBIDDEN", error: "Forbidden" })
      .mockResolvedValueOnce({ ok: false, status: 404, code: "MODULE_NOT_FOUND", error: "Module not found" })
      .mockResolvedValueOnce({ ok: false, status: 409, code: "CONFLICT", error: "Conflict" })
      .mockResolvedValueOnce({
        ok: true,
        value: { moduleId: 3, moduleName: "SEGP", result: "joined" },
      });

    for (const status of [401, 403, 404, 409]) {
      const res = createMockResponse();
      await joinModuleHandler(createModuleJoinRequest({ userSub: 7, body: { code: "ABCD2345" } }), res.res);
      expect(res.statusSpy).toHaveBeenCalledWith(status);
    }

    const okRes = createMockResponse();
    await joinModuleHandler(createModuleJoinRequest({ userSub: 7, body: { code: "ABCD2345" } }), okRes.res);
    expect(okRes.jsonSpy).toHaveBeenCalledWith({
      moduleId: 3,
      moduleName: "SEGP",
      result: "joined",
    });
  });
}

function registerReadValidationTest() {
  it("code-read handler validates auth and module id", async () => {
    const unauthorized = createMockResponse();
    await getModuleJoinCodeHandler(createModuleJoinRequest({ moduleId: "3" }), unauthorized.res);
    expect(unauthorized.statusSpy).toHaveBeenCalledWith(401);

    const invalidModuleId = createMockResponse();
    await getModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "abc" }), invalidModuleId.res);
    expect(invalidModuleId.statusSpy).toHaveBeenCalledWith(400);
  });
}

function registerReadFailureTest() {
  it("code-read handler maps service errors and does not set no-store on failure", async () => {
    (mockState.service.getModuleJoinCode as never).mockResolvedValue({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });

    const res = createMockResponse();
    await getModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "3" }), res.res);
    expect(res.statusSpy).toHaveBeenCalledWith(404);
    expect(res.setHeaderSpy).not.toHaveBeenCalled();
  });
}

function registerReadSuccessTest() {
  it("code-read handler sets no-store on success", async () => {
    (mockState.service.getModuleJoinCode as never).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "ABCD2345" },
    });

    const getRes = createMockResponse();
    await getModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "3" }), getRes.res);
    expect(getRes.setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(getRes.jsonSpy).toHaveBeenCalledWith({ moduleId: 3, joinCode: "ABCD2345" });
  });
}

function registerRotateValidationTest() {
  it("rotate handler validates auth and module id", async () => {
    const unauthorized = createMockResponse();
    await rotateModuleJoinCodeHandler(createModuleJoinRequest({ moduleId: "3" }), unauthorized.res);
    expect(unauthorized.statusSpy).toHaveBeenCalledWith(401);

    const invalidModuleId = createMockResponse();
    await rotateModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "abc" }), invalidModuleId.res);
    expect(invalidModuleId.statusSpy).toHaveBeenCalledWith(400);
  });
}

function registerRotateFailureTest() {
  it("rotate handler maps service errors and does not set no-store on failure", async () => {
    (mockState.service.rotateModuleJoinCode as never).mockResolvedValue({
      ok: false,
      status: 409,
      code: "CONFLICT",
      error: "Conflict",
    });

    const res = createMockResponse();
    await rotateModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "3" }), res.res);
    expect(res.statusSpy).toHaveBeenCalledWith(409);
    expect(res.setHeaderSpy).not.toHaveBeenCalled();
  });
}

function registerRotateSuccessTest() {
  it("rotate handler sets no-store on success", async () => {
    (mockState.service.rotateModuleJoinCode as never).mockResolvedValue({
      ok: true,
      value: { moduleId: 3, joinCode: "WXYZ6789" },
    });

    const rotateRes = createMockResponse();
    await rotateModuleJoinCodeHandler(createModuleJoinRequest({ userSub: 7, moduleId: "3" }), rotateRes.res);
    expect(rotateRes.setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(rotateRes.jsonSpy).toHaveBeenCalledWith({ moduleId: 3, joinCode: "WXYZ6789" });
  });
}
