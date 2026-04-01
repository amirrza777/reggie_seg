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

  it("joins a module and returns the explicit joined result", async () => {
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
  });

  it("returns already_joined when enrollment is idempotent", async () => {
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
  });

  it("rejects non-students and bad codes", async () => {
    mockState.repo.findJoinActor.mockResolvedValueOnce({ id: 7, enterpriseId: "ent-1", role: "STAFF" });
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Forbidden",
    });

    mockState.repo.findJoinActor.mockResolvedValueOnce({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    await expect(joinModuleByCode(7, "bad")).resolves.toEqual({
      ok: false,
      status: 400,
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });

    mockState.repo.findJoinActor.mockResolvedValueOnce({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    await expect(joinModuleByCode(7, "ABCD1I45")).resolves.toEqual({
      ok: false,
      status: 400,
      code: "INVALID_CODE",
      error: "Invalid or unavailable module code",
    });
    expect(mockState.repo.findJoinableModuleByCode).not.toHaveBeenCalled();
  });

  it("returns managed join codes only when the auth-scoped lookup succeeds", async () => {
    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce({ id: 12, joinCode: "ABCD2345" });

    await expect(getModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: true,
      value: { moduleId: 12, joinCode: "ABCD2345" },
    });

    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce(null);

    await expect(getModuleJoinCode({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
  });

  it("rotates a module join code for authorized users", async () => {
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
  });

  it("retries on join-code unique conflicts", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["enterpriseId", "joinCode"] } })
      .mockResolvedValueOnce({ id: 22 });

    await expect(withGeneratedModuleJoinCode("ent-1", write, 2)).resolves.toEqual({ id: 22 });
    expect(write).toHaveBeenCalledTimes(2);
  });
});
