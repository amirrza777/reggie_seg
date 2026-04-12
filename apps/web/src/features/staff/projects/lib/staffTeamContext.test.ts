import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("@/shared/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/auth/session")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectTeams: vi.fn(),
}));

import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffTeamContext } from "./staffTeamContext";

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

describe("getStaffTeamContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users without ADMIN role", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    await expect(getStaffTeamContext("1", "2")).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("returns invalid id error for NaN params", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    await expect(getStaffTeamContext("x", "1")).resolves.toEqual({
      ok: false,
      error: "Invalid project or team ID.",
    });
  });

  it("returns load error when teams request throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("network down"));
    await expect(getStaffTeamContext("10", "20")).resolves.toEqual({
      ok: false,
      error: "network down",
    });
  });

  it("returns not found when team id is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, name: "P", moduleId: 1, moduleName: "M" },
      teams: [{ id: 99, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    await expect(getStaffTeamContext("10", "20")).resolves.toEqual({
      ok: false,
      error: "Team not found in this project.",
    });
  });

  it("returns success payload with aggregate counts", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<
      ReturnType<typeof getCurrentUser>
    >);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, name: "P", moduleId: 1, moduleName: "M", viewerAccessLabel: "Lead" },
      teams: [
        { id: 20, teamName: "T", allocations: [{ userId: 1 }] },
        { id: 21, teamName: "U", allocations: [] },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const result = await getStaffTeamContext("10", "20");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(9);
      expect(result.team.teamName).toBe("T");
      expect(result.project.teamCount).toBe(2);
      expect(result.project.studentCount).toBe(1);
      expect(result.project.viewerAccessLabel).toBe("Lead");
    }
  });
});
