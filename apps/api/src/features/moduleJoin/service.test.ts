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

import { getModuleJoinCode, joinModuleByCode, rotateModuleJoinCode, withGeneratedModuleJoinCode } from "./service.js";

describe("moduleJoin service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("returns unauthorized when actor is not found", async () => {
    mockState.repo.findJoinActor.mockResolvedValue(null);
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      error: "Unauthorized",
    });
  });

  it("rejects staff join attempts", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STAFF" });
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Forbidden",
    });
  });

  it("allows admins to join by module code", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "ADMIN" });
    mockState.repo.findJoinableModuleByCode.mockResolvedValue({ id: 9, name: "SEGP" });
    mockState.repo.insertModuleEnrollment.mockResolvedValue(true);

    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 9,
        moduleName: "SEGP",
        result: "joined",
      },
    });
  });

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

  it("returns managed join codes only when auth-scoped lookup succeeds", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce({ id: 12, joinCode: "ABCD2345" });

    await expect(getModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: true,
      value: { moduleId: 12, joinCode: "ABCD2345" },
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_code_viewed"));

    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce(null);
    await expect(getModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
    infoSpy.mockRestore();
  });

  it("rotates join code for authorized users and emits audit", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValueOnce({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "ABCD2345",
    });
    mockState.repo.updateModuleJoinCode.mockResolvedValueOnce({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "WXYZ6789",
    });

    await expect(rotateModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 12,
        joinCode: "WXYZ6789",
      },
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_code_rotated"));
    infoSpy.mockRestore();
  });

  it("returns not-found when rotate authorization lookup fails", async () => {
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValue(null);
    await expect(rotateModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
  });

  it("returns not-found when rotate update result disappears", async () => {
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValue({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "ABCD2345",
    });
    mockState.repo.updateModuleJoinCode.mockResolvedValue(null);

    await expect(rotateModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
  });

  it("retries on join-code unique conflicts and succeeds", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["enterpriseId", "joinCode"] } })
      .mockResolvedValueOnce({ id: 22 });

    await expect(withGeneratedModuleJoinCode("ent-1", write, 2)).resolves.toEqual({ id: 22 });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-P2002 errors immediately", async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error("db down"));
    await expect(withGeneratedModuleJoinCode("ent-1", write, 3)).rejects.toThrow("db down");
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rethrows P2002 with wrong target meta without retry", async () => {
    const write = vi.fn().mockRejectedValueOnce({ code: "P2002", meta: { target: ["otherField"] } });
    await expect(withGeneratedModuleJoinCode("ent-1", write, 3)).rejects.toEqual(
      expect.objectContaining({ code: "P2002", meta: { target: ["otherField"] } }),
    );
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rethrows P2002 on final attempt", async () => {
    const write = vi
      .fn()
      .mockRejectedValue({ code: "P2002", meta: { target: ["enterpriseId", "joinCode"] } });
    await expect(withGeneratedModuleJoinCode("ent-1", write, 2)).rejects.toEqual(
      expect.objectContaining({ code: "P2002" }),
    );
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("throws terminal generation error when maxAttempts is zero", async () => {
    const write = vi.fn();
    await expect(withGeneratedModuleJoinCode("ent-1", write, 0)).rejects.toThrow(
      "Failed to generate module join code for enterprise ent-1",
    );
    expect(write).not.toHaveBeenCalled();
  });
});
