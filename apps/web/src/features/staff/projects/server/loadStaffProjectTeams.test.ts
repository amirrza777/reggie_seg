import { beforeEach, describe, expect, it, vi } from "vitest";

const getStaffProjectTeamsMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("./getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: (...args: unknown[]) => getStaffProjectTeamsMock(...args),
}));

import { loadStaffProjectTeamsForPage } from "./loadStaffProjectTeams";

describe("loadStaffProjectTeamsForPage", () => {
  beforeEach(() => {
    getStaffProjectTeamsMock.mockReset();
  });

  it("returns invalid_project_id for non-numeric ids", async () => {
    await expect(loadStaffProjectTeamsForPage(1, "abc", "Fallback")).resolves.toEqual({
      status: "invalid_project_id",
    });
  });

  it("returns ok with resolved data and numeric id", async () => {
    getStaffProjectTeamsMock.mockResolvedValue({ teams: [{ id: 1 }] });
    await expect(loadStaffProjectTeamsForPage(3, "42", "Fallback")).resolves.toEqual({
      status: "ok",
      numericProjectId: 42,
      data: { teams: [{ id: 1 }] },
    });
  });

  it("returns specific error message when available", async () => {
    getStaffProjectTeamsMock.mockRejectedValue(new Error("Cannot load project teams"));
    await expect(loadStaffProjectTeamsForPage(3, "42", "Fallback")).resolves.toEqual({
      status: "error",
      message: "Cannot load project teams",
    });
  });

  it("returns fallback error message for empty or non-Error throws", async () => {
    getStaffProjectTeamsMock.mockRejectedValueOnce(new Error("   "));
    await expect(loadStaffProjectTeamsForPage(3, "42", "Fallback 1")).resolves.toEqual({
      status: "error",
      message: "Fallback 1",
    });

    getStaffProjectTeamsMock.mockRejectedValueOnce("boom");
    await expect(loadStaffProjectTeamsForPage(3, "42", "Fallback 2")).resolves.toEqual({
      status: "error",
      message: "Fallback 2",
    });
  });
});
