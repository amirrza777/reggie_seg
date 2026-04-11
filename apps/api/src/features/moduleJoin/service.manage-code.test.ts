import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  repo: {
    findJoinActor: vi.fn(),
    getAuthorizedModuleJoinCode: vi.fn(),
    getAuthorizedModuleForJoinCodeMutation: vi.fn(),
    updateModuleJoinCode: vi.fn(),
    findJoinableModuleByCode: vi.fn(),
    insertModuleEnrollment: vi.fn(),
  },
}));

vi.mock("./repo.js", () => mockState.repo);

import { getModuleJoinCode, rotateModuleJoinCode } from "./service.js";

describe("moduleJoin code management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns managed join codes only when auth-scoped lookup succeeds", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce({ id: 12, joinCode: "ABCD2345" });

    await expect(getModuleJoinCode(1, 12)).resolves.toEqual({
      ok: true,
      value: { moduleId: 12, joinCode: "ABCD2345" },
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_code_viewed"));

    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValueOnce(null);
    await expect(getModuleJoinCode(1, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
    infoSpy.mockRestore();
  });

  it("allows staff to read module join codes when repo authorization passes", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 22, enterpriseId: "ent-1", role: "STAFF" });
    mockState.repo.getAuthorizedModuleJoinCode.mockResolvedValue({ id: 12, joinCode: "ABCD2345" });
    await expect(getModuleJoinCode(22, 12)).resolves.toEqual({
      ok: true,
      value: { moduleId: 12, joinCode: "ABCD2345" },
    });
  });

  it("rejects students from reading module join codes", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    await expect(getModuleJoinCode(7, 12)).resolves.toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Forbidden",
    });
    expect(mockState.repo.getAuthorizedModuleJoinCode).not.toHaveBeenCalled();
  });

  it("returns unauthorized when actor is missing for code read", async () => {
    mockState.repo.findJoinActor.mockResolvedValue(null);
    await expect(getModuleJoinCode(1, 12)).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      error: "Unauthorized",
    });
  });

  it("rotates join code for authorized users and emits audit", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockState.repo.findJoinActor.mockResolvedValue({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
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

    await expect(rotateModuleJoinCode(1, 12)).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 12,
        joinCode: "WXYZ6789",
      },
    });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[moduleJoin:audit]"), expect.stringContaining("module_join_code_rotated"));
    infoSpy.mockRestore();
  });

  it("allows staff to rotate join code when repo authorization passes", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 22, enterpriseId: "ent-1", role: "STAFF" });
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValue({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "ABCD2345",
    });
    mockState.repo.updateModuleJoinCode.mockResolvedValue({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "WXYZ6789",
    });
    await expect(rotateModuleJoinCode(22, 12)).resolves.toEqual({
      ok: true,
      value: { moduleId: 12, joinCode: "WXYZ6789" },
    });
  });

  it("rejects students from rotating join code", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 7, enterpriseId: "ent-1", role: "STUDENT" });
    await expect(rotateModuleJoinCode(7, 12)).resolves.toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      error: "Forbidden",
    });
    expect(mockState.repo.getAuthorizedModuleForJoinCodeMutation).not.toHaveBeenCalled();
  });

  it("returns unauthorized when actor is missing for rotate", async () => {
    mockState.repo.findJoinActor.mockResolvedValue(null);
    await expect(rotateModuleJoinCode(1, 12)).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      error: "Unauthorized",
    });
  });

  it("returns not-found when rotate authorization lookup fails", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValue(null);
    await expect(rotateModuleJoinCode(1, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
  });

  it("returns not-found when rotate update result disappears", async () => {
    mockState.repo.findJoinActor.mockResolvedValue({ id: 1, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" });
    mockState.repo.getAuthorizedModuleForJoinCodeMutation.mockResolvedValue({
      id: 12,
      name: "SEGP",
      enterpriseId: "ent-1",
      joinCode: "ABCD2345",
    });
    mockState.repo.updateModuleJoinCode.mockResolvedValue(null);

    await expect(rotateModuleJoinCode(1, 12)).resolves.toEqual({
      ok: false,
      status: 404,
      code: "MODULE_NOT_FOUND",
      error: "Module not found",
    });
  });
});
