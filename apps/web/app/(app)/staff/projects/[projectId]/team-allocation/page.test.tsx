import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffProjectAllocationPage from "./page";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({ getStaffProjectTeams: vi.fn() }));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

async function renderPage(projectId: string) {
  const node = await StaffProjectAllocationPage({ params: Promise.resolve({ projectId }) });
  render(node);
}

describe("staff project team-allocation page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates when team data cannot be loaded", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "ADMIN", isStaff: false } as any);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("api unavailable"));
    await expect(StaffProjectAllocationPage({ params: Promise.resolve({ projectId: "12" }) })).rejects.toThrow(
      "api unavailable",
    );
  });

  it("renders allocation panels when data loads", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 12, moduleId: 3, name: "P", moduleName: "M" },
      teams: [{ id: 1, teamName: "T", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    await renderPage("12");
    expect(screen.getByText(/empty team/)).toBeInTheDocument();
    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(7, 12);
  });
});
