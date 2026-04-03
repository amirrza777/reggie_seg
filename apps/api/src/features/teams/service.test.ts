import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUserRoleById: vi.fn(),
  findTeamById: vi.fn(),
  dismissTeamFlag: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  findUserRoleById: mocks.findUserRoleById,
  findTeamById: mocks.findTeamById,
  dismissTeamFlag: mocks.dismissTeamFlag,
}));

import { dismissInactivityFlag, isStaffOrAdmin } from "./service.js";

describe("teams service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isStaffOrAdmin returns false when user id missing", async () => {
    await expect(isStaffOrAdmin(undefined)).resolves.toBe(false);
    expect(mocks.findUserRoleById).not.toHaveBeenCalled();
  });

  it("isStaffOrAdmin accepts staff/admin roles and rejects student", async () => {
    mocks.findUserRoleById.mockResolvedValueOnce({ role: "STAFF" });
    await expect(isStaffOrAdmin(1)).resolves.toBe(true);
    mocks.findUserRoleById.mockResolvedValueOnce({ role: "ENTERPRISE_ADMIN" });
    await expect(isStaffOrAdmin(1)).resolves.toBe(true);
    mocks.findUserRoleById.mockResolvedValueOnce({ role: "ADMIN" });
    await expect(isStaffOrAdmin(1)).resolves.toBe(true);
    mocks.findUserRoleById.mockResolvedValueOnce({ role: "STUDENT" });
    await expect(isStaffOrAdmin(1)).resolves.toBe(false);
  });

  it("dismissInactivityFlag returns not found when team missing", async () => {
    mocks.findTeamById.mockResolvedValue(null);
    await expect(dismissInactivityFlag(7)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Team not found",
    });
    expect(mocks.dismissTeamFlag).not.toHaveBeenCalled();
  });

  it("dismissInactivityFlag dismisses flag and returns success", async () => {
    mocks.findTeamById.mockResolvedValue({ id: 7 });
    mocks.dismissTeamFlag.mockResolvedValue({ id: 7, inactivityFlag: "NONE" });
    await expect(dismissInactivityFlag(7)).resolves.toEqual({
      ok: true,
      value: { success: true },
    });
    expect(mocks.dismissTeamFlag).toHaveBeenCalledWith(7);
  });
});
