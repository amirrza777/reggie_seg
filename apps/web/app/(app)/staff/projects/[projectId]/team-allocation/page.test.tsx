import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffProjectAllocationPage from "./page";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});

vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));
vi.mock("@/shared/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/projects/api/client", () => ({ getStaffProjectTeams: vi.fn() }));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

async function renderPage(projectId: string) {
  const node = await StaffProjectAllocationPage({ params: Promise.resolve({ projectId }) });
  render(node);
}

describe("staff project team-allocation page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects non-staff users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, role: "STUDENT", isStaff: false } as any);
    await expect(StaffProjectAllocationPage({ params: Promise.resolve({ projectId: "9" }) })).rejects.toThrow(
      "redirect:/dashboard",
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid project message for non-numeric ids", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "ADMIN", isStaff: false } as any);
    await renderPage("abc");
    expect(screen.getByText("Invalid project ID.")).toBeInTheDocument();
    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
  });

  it("renders fetch error details when team data cannot be loaded", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "ADMIN", isStaff: false } as any);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("api unavailable"));
    await renderPage("12");
    expect(screen.getByText("api unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to staff projects" })).toBeInTheDocument();
  });
});