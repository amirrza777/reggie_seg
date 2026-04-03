import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isStaffOrAdmin: vi.fn(),
  dismissInactivityFlag: vi.fn(),
}));

vi.mock("./service.js", () => ({
  isStaffOrAdmin: mocks.isStaffOrAdmin,
  dismissInactivityFlag: mocks.dismissInactivityFlag,
}));

import { dismissFlagHandler } from "./controller.js";

function createRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("teams controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when actor is not staff/admin", async () => {
    mocks.isStaffOrAdmin.mockResolvedValue(false);
    const res = createRes();
    await dismissFlagHandler({ user: { sub: 4 }, params: { teamId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns 400 on invalid team id", async () => {
    mocks.isStaffOrAdmin.mockResolvedValue(true);
    const res = createRes();
    await dismissFlagHandler({ user: { sub: 4 }, params: { teamId: "bad" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid team ID" });
  });

  it("maps service error status for dismissal", async () => {
    mocks.isStaffOrAdmin.mockResolvedValue(true);
    mocks.dismissInactivityFlag.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Team not found",
    });
    const res = createRes();
    await dismissFlagHandler({ user: { sub: 4 }, params: { teamId: "2" } } as any, res);
    expect(mocks.dismissInactivityFlag).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Team not found" });
  });

  it("returns json success result", async () => {
    mocks.isStaffOrAdmin.mockResolvedValue(true);
    mocks.dismissInactivityFlag.mockResolvedValue({
      ok: true,
      value: { success: true },
    });
    const res = createRes();
    await dismissFlagHandler({ user: { sub: 4 }, params: { teamId: "2" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
