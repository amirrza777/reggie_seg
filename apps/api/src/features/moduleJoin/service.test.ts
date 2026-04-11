import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  repo: {
    findJoinActor: vi.fn(),
    findJoinableModuleByCode: vi.fn(),
    insertModuleEnrollment: vi.fn(),
    getAuthorizedModuleJoinCode: vi.fn(),
    getAuthorizedModuleForJoinCodeMutation: vi.fn(),
    updateModuleJoinCode: vi.fn(),
  },
}));

vi.mock("./repo.js", () => mockState.repo);

import { joinModuleByCode } from "./service.js";

describe("moduleJoin service", registerServiceTests);

function registerServiceTests() {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  registerJoinSuccessTest();
  registerJoinAlreadyJoinedTest();
  registerJoinUnauthorizedTest();
  registerJoinForbiddenTest();
  registerJoinInvalidFormatTest();
  registerJoinUnknownCodeTest();
}

function registerJoinSuccessTest() {
  it("joins a module and returns joined result with audit event", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    mockState.repo.findJoinableModuleByCode.mockResolvedValue({ id: 9, name: "SEGP" });
    mockState.repo.insertModuleEnrollment.mockResolvedValue(true);

    await expect(joinModuleByCode(7, "abcd-2345")).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 9,
        moduleName: "SEGP",
        result: "joined",
      },
    });

    expect(mockState.repo.findJoinableModuleByCode).toHaveBeenCalledWith("ent-1", "ABCD2345");
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_success"));
    infoSpy.mockRestore();
  });
}

function registerJoinAlreadyJoinedTest() {
  it("returns already_joined when enrollment is idempotent and emits audit", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    mockState.repo.findJoinableModuleByCode.mockResolvedValue({ id: 9, name: "SEGP" });
    mockState.repo.insertModuleEnrollment.mockResolvedValue(false);

    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 9,
        moduleName: "SEGP",
        result: "already_joined",
      },
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_already_joined"));
    infoSpy.mockRestore();
  });
}

function registerJoinUnauthorizedTest() {
  it("returns unauthorized when actor is not found", async () => {
    mockState.repo.findJoinActor.mockResolvedValue(null);
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      error: "Unauthorized",
    });
  });
}

function registerJoinForbiddenTest() {
  it("rejects staff join attempts", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STAFF" });
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Forbidden",
    });
  });
}

function registerJoinInvalidFormatTest() {
  it("rejects invalid code before lookup and emits invalid-code audit", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    await expect(joinModuleByCode(7, "bad")).resolves.toEqual({
      ok: false,
      status: 400,
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });
    expect(mockState.repo.findJoinableModuleByCode).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_invalid_code"));
    const payload = JSON.parse(String((infoSpy.mock.calls.at(-1) ?? [])[1] ?? "{}"));
    expect(payload.rawCode).toBeUndefined();
    expect(payload.joinCode).toBeUndefined();
    expect(payload.reason).toBe("invalid_format");
    infoSpy.mockRestore();
  });
}

function registerJoinUnknownCodeTest() {
  it("rejects unknown normalized code and emits invalid-code audit", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    mockState.repo.findJoinableModuleByCode.mockResolvedValue(null);
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 400,
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_invalid_code"));
    const payload = JSON.parse(String((infoSpy.mock.calls.at(-1) ?? [])[1] ?? "{}"));
    expect(payload.rawCode).toBeUndefined();
    expect(payload.joinCode).toBeUndefined();
    expect(payload.reason).toBe("not_found");
    infoSpy.mockRestore();
  });
}
